import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { InvoiceStatus, Prisma } from '@prisma/client';
import { formatUnits } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { generateWallet, getTrxBalance } from '../blockchain/wallet.util';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesDto } from './dto/list-invoices.dto';
import { encryptPrivateKey } from '../orders/wallet-encryption.util';
import { ExpectedPaymentAsset } from '../blockchain/payment-detection.util';
import {
  createJsonRpcProvider,
  executeWithRetry,
} from '../blockchain/json-rpc.provider';
import { getTokenBalanceRaw } from '../blockchain/token-balance.util';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchainService: BlockchainService,
  ) {}

  // =====================================================
  // CREATE INVOICE (JWT BASED)
  // =====================================================

  async createInvoice(merchantId: string, dto: CreateInvoiceDto) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant || !merchant.isActive) {
      throw new UnauthorizedException();
    }

    const network = await this.blockchainService.getActiveNetworkByCodeOrThrow(
      dto.network,
    );

    // Generate wallet based on network type (ETH or TRON)
    let generatedWallet;
    try {
      generatedWallet = generateWallet(network.code || 'ETH');
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Wallet generation failed',
      );
    }

    // Don't lowercase TRON addresses - they are case-sensitive
    const address =
      network.code === 'TRON' || network.code === 'TRON_TESTNET'
        ? generatedWallet.address
        : generatedWallet.address.toLowerCase();

    const wallet = await this.prisma.customerWallet.create({
      data: {
        address,
        privateKey: encryptPrivateKey(generatedWallet.privateKey),
        merchantId: merchant.id,
        networkId: network.id,
        isUsed: true,
      },
    });

    const expiresInMinutes = dto.expiresInMinutes ?? 15;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const invoice = await this.prisma.invoice.create({
      data: {
        merchantId: merchant.id,
        walletId: wallet.id,
        amount: new Prisma.Decimal(dto.amount),
        currency: dto.currency,
        status: InvoiceStatus.PENDING,
        expiresAt,
      },
      include: {
        wallet: {
          include: {
            network: true,
          },
        },
      },
    });

    const paymentAsset = await this.resolveExpectedPaymentAsset(
      invoice.wallet.network,
      invoice.currency,
    );
    const walletBalances = await this.getWalletBalancesForAsset(
      invoice.wallet.network,
      invoice.wallet.address,
      paymentAsset,
    );

    return {
      id: invoice.id,
      amount: invoice.amount.toString(),
      currency: invoice.currency,
      status: invoice.status,
      expiresAt: invoice.expiresAt,
      createdAt: invoice.createdAt,
      paymentAddress: invoice.wallet.address,
      network: {
        name: invoice.wallet.network.name,
        chainId: invoice.wallet.network.chainId.toString(),
        code: invoice.wallet.network.code,
        symbol: invoice.wallet.network.symbol,
      },
      paymentAsset: {
        symbol: paymentAsset.symbol,
        decimals: paymentAsset.decimals,
        isNative: paymentAsset.isNative,
        tokenAddress: paymentAsset.tokenAddress ?? null,
      },
      walletBalances,
      currentBalance: walletBalances.payment.balance,
      currentBalanceSymbol: walletBalances.payment.symbol,
      gasBalance: walletBalances.gas.balance,
      gasSymbol: walletBalances.gas.symbol,
    };
  }

  // =====================================================
  // LIST MERCHANT INVOICES
  // =====================================================

  async listMerchantInvoices(merchantId: string, query: ListInvoicesDto) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        merchantId,
        ...(query.status ? { status: query.status } : {}),
      },
      include: {
        wallet: {
          select: {
            address: true,
            network: {
              select: {
                id: true,
                name: true,
                chainId: true,
                code: true,
                symbol: true,
                rpcUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 20,
    });

    return Promise.all(
      invoices.map(async (invoice) => {
        const paymentAsset = await this.resolveExpectedPaymentAsset(
          invoice.wallet.network,
          invoice.currency,
        );

        return {
          id: invoice.id,
          amount: invoice.amount.toString(),
          currency: invoice.currency,
          status: invoice.status,
          expiresAt: invoice.expiresAt,
          paidAt: invoice.paidAt,
          createdAt: invoice.createdAt,
          paymentAddress: invoice.wallet.address,
          network: {
            name: invoice.wallet.network.name,
            chainId: invoice.wallet.network.chainId.toString(),
            code: invoice.wallet.network.code,
            symbol: invoice.wallet.network.symbol,
          },
          paymentAsset: {
            symbol: paymentAsset.symbol,
            decimals: paymentAsset.decimals,
            isNative: paymentAsset.isNative,
            tokenAddress: paymentAsset.tokenAddress ?? null,
          },
        };
      }),
    );
  }

  // =====================================================
  // GET INVOICE DETAILS
  // =====================================================

  async getInvoiceById(merchantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        merchantId,
      },
      include: {
        wallet: {
          include: {
            network: true,
          },
        },
        payments: {
          orderBy: {
            detectedAt: 'desc',
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const paymentAsset = await this.resolveExpectedPaymentAsset(
      invoice.wallet.network,
      invoice.currency,
    );
    const walletBalances = await this.getWalletBalancesForAsset(
      invoice.wallet.network,
      invoice.wallet.address,
      paymentAsset,
    );

    return {
      id: invoice.id,
      amount: invoice.amount.toString(),
      currency: invoice.currency,
      status: invoice.status,
      expiresAt: invoice.expiresAt,
      paidAt: invoice.paidAt,
      createdAt: invoice.createdAt,
      paymentAddress: invoice.wallet.address,
      network: {
        name: invoice.wallet.network.name,
        chainId: invoice.wallet.network.chainId.toString(),
        code: invoice.wallet.network.code,
        symbol: invoice.wallet.network.symbol,
      },
      paymentAsset: {
        symbol: paymentAsset.symbol,
        decimals: paymentAsset.decimals,
        isNative: paymentAsset.isNative,
        tokenAddress: paymentAsset.tokenAddress ?? null,
      },
      walletBalances,
      currentBalance: walletBalances.payment.balance,
      currentBalanceSymbol: walletBalances.payment.symbol,
      gasBalance: walletBalances.gas.balance,
      gasSymbol: walletBalances.gas.symbol,
      payments: invoice.payments.map((payment) => ({
        id: payment.id,
        txHash: payment.txHash,
        fromAddress: payment.fromAddress,
        toAddress: payment.toAddress,
        amount: payment.amount.toString(),
        rawAmount: payment.rawAmount,
        asset: {
          symbol: payment.tokenSymbol || paymentAsset.symbol,
          tokenAddress: payment.tokenAddress,
          isTokenTransfer: payment.isTokenTransfer,
        },
        status: payment.status,
        confirmations: payment.confirmations,
        detectedAt: payment.detectedAt,
        confirmedAt: payment.confirmedAt,
      })),
    };
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

  private defaultNativeAsset(network: {
    code?: string | null;
    symbol?: string | null;
    rpcUrl: string;
  }): ExpectedPaymentAsset {
    const looksTron =
      this.isTronNetwork(network.code) ||
      network.rpcUrl.toLowerCase().includes('tron');

    return {
      symbol: looksTron ? 'TRX' : network.symbol?.trim().toUpperCase() || 'ETH',
      decimals: looksTron ? 6 : 18,
      isNative: true,
      tokenId: null,
      tokenAddress: null,
    };
  }

  private async getWalletBalancesForAsset(
    network: {
      code?: string | null;
      symbol?: string | null;
      rpcUrl: string;
    },
    walletAddress: string,
    asset: ExpectedPaymentAsset,
  ): Promise<{
    payment: {
      symbol: string;
      balance: string;
      rawBalance: string;
      decimals: number;
      tokenAddress: string | null;
      isNative: boolean;
    };
    gas: {
      symbol: string;
      balance: string;
      rawBalance: string;
      decimals: number;
      tokenAddress: null;
      isNative: true;
    };
  }> {
    const nativeAsset = this.defaultNativeAsset(network);
    const nativeSymbol = nativeAsset.symbol;
    const nativeDecimals = nativeAsset.decimals;

    let nativeRaw = 0n;
    try {
      nativeRaw = await this.getNativeBalanceRaw(network, walletAddress);
    } catch {
      nativeRaw = 0n;
    }

    let paymentRaw = nativeRaw;
    if (!asset.isNative) {
      if (!asset.tokenAddress) {
        paymentRaw = 0n;
      } else {
        try {
          paymentRaw = await getTokenBalanceRaw({
            walletAddress,
            tokenAddress: asset.tokenAddress,
            rpcUrl: network.rpcUrl,
            networkCode: network.code,
          });
        } catch {
          paymentRaw = 0n;
        }
      }
    }

    return {
      payment: {
        symbol: asset.symbol,
        balance: formatUnits(paymentRaw, asset.decimals),
        rawBalance: paymentRaw.toString(),
        decimals: asset.decimals,
        tokenAddress: asset.tokenAddress ?? null,
        isNative: asset.isNative,
      },
      gas: {
        symbol: nativeSymbol,
        balance: formatUnits(nativeRaw, nativeDecimals),
        rawBalance: nativeRaw.toString(),
        decimals: nativeDecimals,
        tokenAddress: null,
        isNative: true,
      },
    };
  }

  private async getNativeBalanceRaw(
    network: {
      code?: string | null;
      rpcUrl: string;
    },
    walletAddress: string,
  ): Promise<bigint> {
    if (this.isTronNetwork(network.code)) {
      return getTrxBalance(
        walletAddress,
        network.rpcUrl,
        network.code || undefined,
      );
    }

    return executeWithRetry(
      `evm.getBalance(${walletAddress})`,
      async () => {
        const provider = createJsonRpcProvider(network.rpcUrl);
        return provider.getBalance(walletAddress);
      },
      network.code || undefined,
    );
  }

  private isTronNetwork(networkCode?: string | null): boolean {
    const normalized = networkCode?.trim().toUpperCase();
    return (
      normalized === 'TRON' ||
      normalized === 'TRON_TESTNET' ||
      Boolean(normalized?.includes('TRON'))
    );
  }
}
