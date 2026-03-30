import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

import {
  CustomerWallet,
  Invoice,
  InvoiceStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

import { formatUnits } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ValidatePaymentDto } from './dto/validate-payment.dto';
import {
  detectExpectedPayment,
  ExpectedPaymentAsset,
} from '../blockchain/payment-detection.util';
import { fetchChainTransaction } from '../blockchain/transaction.util';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchainService: BlockchainService,
  ) {}

  // =====================================================
  // JWT BASED PAYMENT VALIDATION
  // =====================================================

  async validatePayment(merchantId: string, dto: ValidatePaymentDto) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant || !merchant.isActive) {
      throw new UnauthorizedException();
    }

    const network = await this.blockchainService.getActiveNetworkByCodeOrThrow(
      dto.network,
    );

    const normalizedNetworkCode = network.code?.trim().toUpperCase();
    const isTronNetwork =
      normalizedNetworkCode === 'TRON' ||
      normalizedNetworkCode === 'TRON_TESTNET' ||
      network.rpcUrl.toLowerCase().includes('tron');

    const txHash = isTronNetwork
      ? dto.txHash.replace(/^0x/i, '').toLowerCase()
      : dto.txHash.startsWith('0x')
        ? dto.txHash.toLowerCase()
        : dto.txHash;

    let invoice: (Invoice & { wallet: CustomerWallet }) | null = null;
    let expectedAsset: ExpectedPaymentAsset;
    let transaction: Awaited<ReturnType<typeof detectExpectedPayment>>;

    if (dto.invoiceId) {
      const requestedInvoice = await this.prisma.invoice.findFirst({
        where: {
          id: dto.invoiceId,
          merchantId: merchant.id,
        },
        include: { wallet: true },
      });

      if (!requestedInvoice) {
        throw new NotFoundException('Invoice not found');
      }

      if (requestedInvoice.wallet.networkId !== network.id) {
        throw new BadRequestException('Invoice network mismatch');
      }

      expectedAsset = await this.resolveExpectedPaymentAsset(
        network,
        requestedInvoice.currency,
      );

      try {
        transaction = await detectExpectedPayment({
          txHash,
          networkCode: network.code,
          rpcUrl: network.rpcUrl,
          expectedRecipient: requestedInvoice.wallet.address,
          expectedAsset,
        });
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error
            ? error.message
            : 'Unable to validate transaction',
        );
      }

      invoice = requestedInvoice;
    } else {
      expectedAsset = this.defaultNativeAsset(network);

      let nativeTransaction;
      try {
        nativeTransaction = await fetchChainTransaction({
          txHash,
          networkCode: network.code,
          rpcUrl: network.rpcUrl,
        });
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error
            ? error.message
            : 'Unable to validate transaction',
        );
      }

      if (!nativeTransaction) {
        throw new NotFoundException(
          'Transaction not found on selected network',
        );
      }

      transaction = {
        txHash: nativeTransaction.txHash,
        from: nativeTransaction.from,
        to: nativeTransaction.to,
        amountRaw: nativeTransaction.value,
        blockNumber: nativeTransaction.blockNumber,
        timestamp: null,
        status: nativeTransaction.status,
        currentBlock: nativeTransaction.currentBlock,
        tokenAddress: null,
        isTokenTransfer: false,
      };

      invoice = await this.resolveInvoice(
        merchant.id,
        network.id,
        isTronNetwork ? transaction.to : transaction.to.toLowerCase(),
        undefined,
        isTronNetwork,
      );

      if (invoice) {
        const invoiceAsset = await this.resolveExpectedPaymentAsset(
          network,
          invoice.currency,
        );
        if (!invoiceAsset.isNative) {
          throw new BadRequestException(
            'Token payment validation requires invoiceId',
          );
        }
      }
    }

    if (!transaction) {
      throw new NotFoundException('Transaction not found on selected network');
    }

    if (
      invoice &&
      this.isTransactionOlderThanInvoice(
        transaction.timestamp,
        invoice.createdAt,
      )
    ) {
      throw new BadRequestException(
        'Transaction is older than this invoice. Please use the latest payment transaction.',
      );
    }

    if (!transaction.from) {
      throw new BadRequestException('Transaction has no source address');
    }

    // For TRON, addresses are case-sensitive (base58). For ETH, lowercase them.
    const toAddress = isTronNetwork
      ? transaction.to
      : transaction.to.toLowerCase();
    const fromAddress = isTronNetwork
      ? transaction.from
      : transaction.from.toLowerCase();

    const confirmations = transaction.blockNumber
      ? Math.max(transaction.currentBlock - transaction.blockNumber + 1, 0)
      : 0;

    const requiredConfirmations = dto.requiredConfirmations ?? 1;

    const status =
      transaction.status === 1 && confirmations >= requiredConfirmations
        ? PaymentStatus.CONFIRMED
        : transaction.status === 0
          ? PaymentStatus.FAILED
          : PaymentStatus.PENDING;

    const paymentAmount = this.toDbAmount(
      transaction.amountRaw,
      expectedAsset.decimals,
    );

    const payment = await this.prisma.paymentTransaction.upsert({
      where: {
        networkId_txHash: {
          networkId: network.id,
          txHash,
        },
      },
      create: {
        txHash,
        fromAddress,
        toAddress,
        amount: paymentAmount,
        rawAmount: transaction.amountRaw.toString(),
        tokenId: expectedAsset.tokenId ?? null,
        tokenSymbol: expectedAsset.symbol,
        tokenAddress:
          transaction.tokenAddress ?? expectedAsset.tokenAddress ?? null,
        isTokenTransfer: transaction.isTokenTransfer,
        confirmations,
        networkId: network.id,
        invoiceId: invoice?.id,
        status,
        confirmedAt: status === PaymentStatus.CONFIRMED ? new Date() : null,
      },
      update: {
        fromAddress,
        toAddress,
        amount: paymentAmount,
        rawAmount: transaction.amountRaw.toString(),
        tokenId: expectedAsset.tokenId ?? null,
        tokenSymbol: expectedAsset.symbol,
        tokenAddress:
          transaction.tokenAddress ?? expectedAsset.tokenAddress ?? null,
        isTokenTransfer: transaction.isTokenTransfer,
        confirmations,
        invoiceId: invoice?.id,
        status,
        confirmedAt: status === PaymentStatus.CONFIRMED ? new Date() : null,
      },
    });

    let invoiceStatus = invoice?.status ?? null;
    let invoicePaidAt: Date | null = invoice?.paidAt ?? null;

    if (
      invoice &&
      status === PaymentStatus.CONFIRMED &&
      paymentAmount.greaterThanOrEqualTo(invoice.amount as Prisma.Decimal)
    ) {
      const markPaid = await this.prisma.invoice.updateMany({
        where: {
          id: invoice.id,
          status: InvoiceStatus.PENDING,
        },
        data: {
          status: InvoiceStatus.PAID,
          paidAt: new Date(),
        },
      });

      if (markPaid.count > 0) {
        const refreshed = await this.prisma.invoice.findUnique({
          where: { id: invoice.id },
          select: {
            status: true,
            paidAt: true,
          },
        });

        invoiceStatus = refreshed?.status ?? null;
        invoicePaidAt = refreshed?.paidAt ?? null;
      }
    }

    return {
      paymentId: payment.id,
      txHash: payment.txHash,
      network: {
        name: network.name,
        chainId: network.chainId.toString(),
        code: network.code,
        symbol: network.symbol,
      },
      fromAddress: payment.fromAddress,
      toAddress: payment.toAddress,
      amount: payment.amount.toString(),
      rawAmount: payment.rawAmount,
      asset: {
        symbol: payment.tokenSymbol ?? expectedAsset.symbol,
        tokenAddress:
          payment.tokenAddress ?? expectedAsset.tokenAddress ?? null,
        isTokenTransfer: payment.isTokenTransfer,
      },
      confirmations: payment.confirmations,
      requiredConfirmations,
      paymentStatus: payment.status,
      invoiceId: invoice?.id ?? null,
      invoiceStatus,
      invoicePaidAt,
      detectedAt: payment.detectedAt,
      confirmedAt: payment.confirmedAt,
    };
  }

  async getPaymentsForInvoice(merchantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        merchantId,
      },
      select: {
        id: true,
        status: true,
        paidAt: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const payments = await this.prisma.paymentTransaction.findMany({
      where: { invoiceId },
      include: {
        network: {
          select: {
            name: true,
            chainId: true,
            code: true,
            symbol: true,
          },
        },
      },
      orderBy: {
        detectedAt: 'desc',
      },
    });

    return {
      invoice,
      payments: payments.map((p) => ({
        id: p.id,
        txHash: p.txHash,
        fromAddress: p.fromAddress,
        toAddress: p.toAddress,
        amount: p.amount.toString(),
        rawAmount: p.rawAmount,
        asset: {
          symbol: p.tokenSymbol ?? p.network?.symbol ?? null,
          tokenAddress: p.tokenAddress,
          isTokenTransfer: p.isTokenTransfer,
        },
        confirmations: p.confirmations,
        status: p.status,
        detectedAt: p.detectedAt,
        confirmedAt: p.confirmedAt,
        network: p.network
          ? {
              ...p.network,
              chainId: p.network.chainId.toString(),
            }
          : null,
      })),
    };
  }

  // =====================================================

  private async resolveInvoice(
    merchantId: string,
    networkId: string,
    toAddress: string,
    invoiceId?: string,
    isTronNetwork = false,
  ): Promise<(Invoice & { wallet: CustomerWallet }) | null> {
    if (invoiceId) {
      const invoice = await this.prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          merchantId,
        },
        include: { wallet: true },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      if (invoice.wallet.networkId !== networkId) {
        throw new BadRequestException('Invoice network mismatch');
      }

      // Compare addresses - TRON addresses are case-sensitive
      const walletAddress = invoice.wallet.address;
      const addressesMatch = isTronNetwork
        ? walletAddress === toAddress
        : walletAddress.toLowerCase() === toAddress.toLowerCase();

      if (!addressesMatch) {
        throw new BadRequestException('Destination address mismatch');
      }

      return invoice;
    }

    return this.prisma.invoice.findFirst({
      where: {
        merchantId,
        wallet: {
          networkId,
          address: toAddress,
        },
        status: {
          in: [InvoiceStatus.PENDING, InvoiceStatus.PAID],
        },
      },
      include: { wallet: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private toDbAmount(value: bigint, decimals: number): Prisma.Decimal {
    const normalizedAmount = formatUnits(value, decimals);

    const [whole, fraction = ''] = normalizedAmount.split('.');

    const normalized = fraction.length
      ? `${whole}.${fraction.slice(0, 8)}`
      : whole;

    return new Prisma.Decimal(normalized);
  }

  private async resolveExpectedPaymentAsset(
    network: {
      id: string;
      code?: string | null;
      symbol?: string | null;
      rpcUrl: string;
    },
    currency: string,
  ): Promise<ExpectedPaymentAsset> {
    const normalizedCurrency = String(currency || '')
      .trim()
      .toUpperCase();
    if (!normalizedCurrency) {
      throw new BadRequestException('Invoice currency is missing');
    }

    const configuredToken = await this.prisma.networkToken.findFirst({
      where: {
        networkId: network.id,
        symbol: normalizedCurrency,
        isActive: true,
      },
    });

    if (configuredToken) {
      return {
        symbol: configuredToken.symbol,
        decimals: configuredToken.decimals,
        isNative: configuredToken.isNative,
        tokenAddress: configuredToken.contractAddress,
        tokenId: configuredToken.id,
      };
    }

    const native = this.defaultNativeAsset(network);
    if (normalizedCurrency === native.symbol) {
      return native;
    }

    throw new BadRequestException(
      `Currency ${normalizedCurrency} is not configured for network ${network.code || network.id}`,
    );
  }

  private isTronNetworkCode(networkCode: string | null | undefined): boolean {
    const normalizedCode = String(networkCode || '')
      .trim()
      .toUpperCase();
    return (
      normalizedCode === 'TRON' ||
      normalizedCode === 'TRON_TESTNET' ||
      normalizedCode.includes('TRON')
    );
  }

  private defaultNativeAsset(network: {
    code?: string | null;
    symbol?: string | null;
    rpcUrl: string;
  }): ExpectedPaymentAsset {
    const looksTron =
      this.isTronNetworkCode(network.code) ||
      network.rpcUrl.toLowerCase().includes('tron');

    return {
      symbol: looksTron ? 'TRX' : network.symbol?.trim().toUpperCase() || 'ETH',
      decimals: looksTron ? 6 : 18,
      isNative: true,
      tokenId: null,
      tokenAddress: null,
    };
  }

  private isTransactionOlderThanInvoice(
    txTimestampSeconds: number | null | undefined,
    invoiceCreatedAt: Date,
  ): boolean {
    if (!txTimestampSeconds) {
      return false;
    }

    const txTimestampMs = txTimestampSeconds * 1000;
    const allowedClockSkewMs = 2 * 60 * 1000;
    return txTimestampMs + allowedClockSkewMs < invoiceCreatedAt.getTime();
  }
}
