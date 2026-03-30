import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CustomerWallet,
  InvoiceStatus,
  OrderStatus,
  PaymentStatus,
  PayoutStatus,
  Prisma,
} from '@prisma/client';
import {
  formatUnits,
  Interface,
  parseUnits,
  Wallet as EthersWallet,
  JsonRpcProvider,
} from 'ethers';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  generateWallet,
  getTronWeb,
  getTrxBalance,
} from '../blockchain/wallet.util';
import {
  createJsonRpcProvider,
  executeWithRetry,
} from '../blockchain/json-rpc.provider';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyOrderPaymentDto } from './dto/verify-order-payment.dto';
import { decryptPrivateKey, encryptPrivateKey } from './wallet-encryption.util';
import {
  detectExpectedPayment,
  ExpectedPaymentAsset,
} from '../blockchain/payment-detection.util';
import { getTokenBalanceRaw } from '../blockchain/token-balance.util';

const ERC20_INTERFACE = new Interface([
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
]);
const ERC20_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

@Injectable()
export class OrdersService {
  private static readonly RETRY_USED_MARKER = '[retry-used]';
  private static readonly PRICE_CACHE_TTL_MS = 60_000;
  private static readonly STABLE_USD_SYMBOLS = new Set(['USD', 'USDT', 'USDC']);
  private static readonly COINGECKO_IDS_BY_SYMBOL: Record<string, string> = {
    ETH: 'ethereum',
    WETH: 'ethereum',
    BNB: 'binancecoin',
    WBNB: 'binancecoin',
    MATIC: 'matic-network',
    WMATIC: 'matic-network',
    POL: 'matic-network',
    TRX: 'tron',
    DAI: 'dai',
  };

  private readonly usdPriceCache = new Map<
    string,
    { value: Prisma.Decimal; expiresAt: number }
  >();

  constructor(private readonly prisma: PrismaService) {}

  async resolveCustomerIdFromAuthUser(user: any): Promise<string> {
    if (user?.customerId) {
      return user.customerId;
    }

    if (user?.role === 'MERCHANT' && user?.email) {
      const email = String(user.email).trim().toLowerCase();

      const existing = await this.prisma.customer.findUnique({
        where: { email },
      });

      if (existing) {
        return existing.id;
      }

      const hashedPassword = await bcrypt.hash(
        randomBytes(24).toString('hex'),
        10,
      );

      const created = await this.prisma.customer.create({
        data: {
          email,
          password: hashedPassword,
          isActive: true,
        },
      });

      return created.id;
    }

    throw new UnauthorizedException('Unauthorized user context');
  }

  async createPendingOrder(customerId: string, dto: CreateOrderDto) {
    console.log(
      `[ORDER] Starting createPendingOrder for customer ${customerId}, items:`,
      dto.items.length,
    );

    // Validate customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      console.error(`[ORDER] Customer ${customerId} not found`);
      throw new BadRequestException(`Customer ${customerId} not found`);
    }
    console.log(`[ORDER] Customer validated: ${customer.email}`);

    // Idempotency check - skip if no key
    if (dto.idempotencyKey) {
      const existingOrder = await this.prisma.order.findUnique({
        where: {
          customerId_idempotencyKey: {
            customerId,
            idempotencyKey: dto.idempotencyKey,
          },
        },
      });

      if (existingOrder) {
        console.log(
          `[ORDER] Idempotency hit: returning existing order ${existingOrder.id}`,
        );
        // Return existing or throw based on status
        if (
          existingOrder.status === OrderStatus.CREATED ||
          existingOrder.status === OrderStatus.PENDING_PAYMENT
        ) {
          return {
            orderId: existingOrder.id,
            invoiceId: existingOrder.invoiceId,
            amount: existingOrder.totalAmount.toString(),
            paymentAmount:
              existingOrder.paymentAmount?.toString() ??
              existingOrder.totalAmount.toString(),
            paymentCurrency: existingOrder.paymentCurrency ?? null,
            orderValueUsdt: existingOrder.orderValueUsdt?.toString() ?? null,
            status: existingOrder.status,
            message: 'Idempotent request returned existing order',
          };
        }
        throw new BadRequestException(
          'Idempotency key used for non-retryable order status',
        );
      }
    }

    // Fetch all products
    console.log(
      `[ORDER] Fetching products:`,
      dto.items.map((i) => i.productId),
    );
    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.items.map((item) => item.productId) } },
      include: {
        merchant: { select: { id: true, name: true } },
        categories: true,
      },
    });

    console.log(
      `[ORDER] Found ${products.length}/${dto.items.length} products`,
    );
    if (products.length !== dto.items.length) {
      const missing = dto.items
        .filter((item) => !products.some((p) => p.id === item.productId))
        .map((i) => i.productId);
      console.error(`[ORDER] Missing products:`, missing);
      throw new NotFoundException(`Products not found: ${missing.join(', ')}`);
    }
    const productById = new Map(products.map((p) => [p.id, p] as const));

    const insufficientStockItem = dto.items.find((item) => {
      const product = productById.get(item.productId);
      return !product || product.quantity < item.quantity;
    });
    if (insufficientStockItem) {
      const product = productById.get(insufficientStockItem.productId);
      const availableQty = product?.quantity ?? 0;
      const productName = product?.name ?? insufficientStockItem.productId;
      throw new BadRequestException(
        `Insufficient stock for ${productName}. Requested ${insufficientStockItem.quantity}, available ${availableQty}.`,
      );
    }

    // Validate same merchant
    const merchantId = products[0].merchantId;
    const merchantName = products[0].merchant?.name;
    const allSameMerchant = products.every((p) => p.merchantId === merchantId);
    console.log(`[ORDER] Merchant validated: ${merchantId} (${merchantName})`);
    if (!allSameMerchant) {
      throw new BadRequestException('All items must be from the same merchant');
    }

    // Validate delivery address belongs to customer
    if (dto.deliveryAddressId) {
      const address = await this.prisma.customerAddress.findFirst({
        where: {
          id: dto.deliveryAddressId,
          customerId,
          isActive: true,
        },
      });
      if (!address) {
        throw new BadRequestException('Invalid delivery address');
      }
    }

    console.log(`[ORDER] Looking for network blockchainId=${dto.blockchainId}`);

    const network = dto.blockchainId
      ? await this.prisma.blockchainNetwork.findFirst({
          where: {
            id: dto.blockchainId,
            isActive: true,
          },
        })
      : await this.prisma.blockchainNetwork.findFirst({
          where: {
            chainId: 10n, // Optimism
            isActive: true,
          },
        });

    console.log(
      `[ORDER] Specific network found:`,
      network ? `${network.code}(${network.chainId})` : 'none',
    );

    const selectedNetwork =
      network ??
      (await this.prisma.blockchainNetwork.findFirst({
        where: { isActive: true },
        orderBy: { chainId: 'asc' },
      }));

    console.log(
      `[ORDER] Final selected network:`,
      selectedNetwork
        ? `${selectedNetwork.code}(${selectedNetwork.chainId})`
        : 'NONE',
    );

    if (!selectedNetwork) {
      const activeNetworks = await this.prisma.blockchainNetwork.count({
        where: { isActive: true },
      });
      console.error(
        `[ORDER] No active networks found. Active count: ${activeNetworks}`,
      );
      throw new NotFoundException(
        `No active blockchain network found. Active networks: ${activeNetworks}`,
      );
    }

    // Use first product's currency for all (validate all same)
    const productCurrency = this.normalizePaymentSymbol(products[0].currency);
    if (
      !products.every(
        (p) => this.normalizePaymentSymbol(p.currency) === productCurrency,
      )
    ) {
      throw new BadRequestException('All items must have the same currency');
    }

    const requestedPaymentCurrency = this.normalizePaymentSymbol(
      dto.paymentSymbol || productCurrency,
    );

    const productTotalAmount = dto.items.reduce((sum, item) => {
      const product = productById.get(item.productId)!;
      const subtotal = new Prisma.Decimal(product.price).mul(item.quantity);
      return sum.add(subtotal);
    }, new Prisma.Decimal(0));

    const deliveryFeeUsd = new Prisma.Decimal(dto.deliveryFeeUsd || 0);
    const deliveryFeeInProductCurrency = deliveryFeeUsd.greaterThan(0)
      ? await this.convertAmountBetweenSymbols(
          deliveryFeeUsd,
          'USDT',
          productCurrency,
        )
      : new Prisma.Decimal(0);

    const pricingTotalAmount = productTotalAmount.add(
      deliveryFeeInProductCurrency,
    );

    const payableTotalAmount = await this.convertAmountBetweenSymbols(
      pricingTotalAmount,
      productCurrency,
      requestedPaymentCurrency,
    );
    let orderValueUsdt: Prisma.Decimal | null = null;
    try {
      orderValueUsdt = await this.convertAmountBetweenSymbols(
        pricingTotalAmount,
        productCurrency,
        'USDT',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[ORDER] Unable to snapshot USDT order value for customer=${customerId}. currency=${productCurrency}. ${message}`,
      );
    }

    const paymentAsset = await this.resolveExpectedPaymentAsset(
      selectedNetwork,
      requestedPaymentCurrency,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const stockUpdate = await tx.product.updateMany({
          where: {
            id: item.productId,
            quantity: {
              gte: item.quantity,
            },
          },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });

        if (stockUpdate.count === 0) {
          const product = productById.get(item.productId);
          throw new BadRequestException(
            `Insufficient stock for ${product?.name ?? item.productId}. Please refresh and try again.`,
          );
        }
      }

      const wallet = await this.getOrCreateCustomerWallet(tx, {
        customerId,
        networkId: selectedNetwork.id,
        networkCode: selectedNetwork.code,
        merchantId,
      });

      const invoice = await tx.invoice.create({
        data: {
          merchantId,
          walletId: wallet.id,
          amount: payableTotalAmount,
          currency: requestedPaymentCurrency,
          status: InvoiceStatus.PENDING,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });

      const order = await tx.order.create({
        data: {
          customerId,
          deliveryAddressId: dto.deliveryAddressId || null,
          merchantId,
          invoiceId: invoice.id,
          totalAmount: payableTotalAmount,
          paymentAmount: payableTotalAmount,
          paymentCurrency: requestedPaymentCurrency,
          orderValueUsdt,
          status: OrderStatus.PENDING_PAYMENT,
        },
      });

      // Create order items
      const orderItems = await Promise.all(
        dto.items.map(async (item) => {
          const product = productById.get(item.productId)!;
          const subtotal = new Prisma.Decimal(product.price).mul(item.quantity);

          return tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: item.productId,
              quantity: item.quantity,
              priceAtPurchase: product.price,
              subtotal,
            },
          });
        }),
      );

      return { order, invoice, wallet, orderItems };
    });

    const walletBalances = await this.getWalletBalancesForAsset(
      selectedNetwork,
      result.wallet.address,
      paymentAsset,
    );

    return {
      orderId: result.order.id,
      invoiceId: result.invoice.id,
      walletAddress: result.wallet.address,
      amount: result.order.totalAmount.toString(),
      paymentAmount:
        result.order.paymentAmount?.toString() ??
        result.order.totalAmount.toString(),
      paymentCurrency: result.order.paymentCurrency ?? requestedPaymentCurrency,
      orderValueUsdt: result.order.orderValueUsdt?.toString() ?? null,
      pricingAmount: pricingTotalAmount.toString(),
      deliveryFeeAmount: deliveryFeeInProductCurrency.toString(),
      pricingCurrency: productCurrency,
      status: result.order.status,
      network: {
        id: selectedNetwork.id,
        name: selectedNetwork.name,
        chainId: selectedNetwork.chainId.toString(),
        code: selectedNetwork.code,
        symbol: selectedNetwork.symbol,
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
      latestPaymentTxHash: null,
      itemsCount: result.orderItems.length,
    };
  }

  private async getOrCreateCustomerWallet(
    tx: Prisma.TransactionClient,
    params: {
      customerId: string;
      networkId: string;
      networkCode?: string | null;
      merchantId: string;
    },
  ): Promise<CustomerWallet> {
    console.log(
      `[WALLET] getOrCreateCustomerWallet customerId=${params.customerId}, networkId=${params.networkId}, networkCode=${params.networkCode}, merchantId=${params.merchantId}`,
    );

    const existingWallets = await tx.customerWallet.findMany({
      where: {
        customerId: params.customerId,
        networkId: params.networkId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const brokenWalletIds: string[] = [];
    for (const existing of existingWallets) {
      if (this.canUseStoredWalletPrivateKey(existing.privateKey)) {
        console.log(`[WALLET] Using existing wallet ${existing.address}`);
        return existing;
      }
      brokenWalletIds.push(existing.id);
      console.warn(
        `[WALLET] Skipping undecryptable wallet ${existing.id} (${existing.address})`,
      );
    }

    if (brokenWalletIds.length > 0) {
      await tx.customerWallet.updateMany({
        where: {
          id: { in: brokenWalletIds },
          customerId: params.customerId,
        },
        data: {
          customerId: null,
          isUsed: false,
        },
      });
    }

    console.log(
      `[WALLET] Generating new wallet for ${params.networkCode || 'ETH'}`,
    );

    let generatedWallet;
    try {
      generatedWallet = generateWallet(params.networkCode || 'ETH');
      console.log(`[WALLET] Generated wallet: ${generatedWallet.address}`);
    } catch (error) {
      console.error(`[WALLET] generateWallet failed:`, error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Wallet generation failed',
      );
    }

    const walletAddress = this.isTronNetwork(params.networkCode)
      ? generatedWallet.address
      : generatedWallet.address.toLowerCase();

    console.log(`[WALLET] Final address: ${walletAddress}`);

    let encryptedPrivateKey;
    try {
      encryptedPrivateKey = encryptPrivateKey(generatedWallet.privateKey);
      console.log(`[WALLET] Private key encrypted successfully`);
    } catch (error) {
      console.error(`[WALLET] encryptPrivateKey failed:`, error);
      throw new BadRequestException('Wallet encryption failed');
    }

    const created = await this.createCustomerWalletWithRetry(tx, {
      customerId: params.customerId,
      networkId: params.networkId,
      address: walletAddress,
      privateKey: encryptedPrivateKey,
      merchantId: params.merchantId,
    });

    if (!created) {
      console.error(`[WALLET] createCustomerWalletWithRetry failed`);
      throw new BadRequestException(
        'Unable to create customer wallet in database',
      );
    }

    console.log(`[WALLET] Wallet created successfully: ${created.id}`);
    return created;
  }

  private async createCustomerWalletWithRetry(
    tx: Prisma.TransactionClient,
    params: {
      customerId: string;
      networkId: string;
      address: string;
      privateKey: string;
      merchantId?: string;
    },
  ) {
    try {
      return await tx.customerWallet.create({
        data: {
          address: params.address,
          privateKey: params.privateKey,
          merchantId: params.merchantId,
          customerId: params.customerId,
          networkId: params.networkId,
          isUsed: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existingWallets = await tx.customerWallet.findMany({
          where: {
            customerId: params.customerId,
            networkId: params.networkId,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        return (
          existingWallets.find((wallet) =>
            this.canUseStoredWalletPrivateKey(wallet.privateKey),
          ) || null
        );
      }
      throw error;
    }
  }

  private canUseStoredWalletPrivateKey(
    encryptedPrivateKey: string | null | undefined,
  ): boolean {
    if (!encryptedPrivateKey) {
      return false;
    }

    try {
      const decrypted = decryptPrivateKey(encryptedPrivateKey);
      return Boolean(decrypted);
    } catch {
      return false;
    }
  }

  private isTronNetwork(networkCode?: string | null): boolean {
    const normalized = networkCode?.trim().toUpperCase();
    return (
      normalized === 'TRON' ||
      normalized === 'TRON_TESTNET' ||
      Boolean(normalized?.includes('TRON'))
    );
  }

  async listOrdersForCustomer(customerId: string) {
    const orders = await this.prisma.order.findMany({
      where: { customerId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                currency: true,
              },
            },
          },
        },
        invoice: {
          include: {
            wallet: {
              include: {
                network: {
                  select: {
                    id: true,
                    name: true,
                    chainId: true,
                    code: true,
                    symbol: true,
                  },
                },
              },
            },
            payments: {
              select: {
                txHash: true,
              },
              orderBy: {
                detectedAt: 'desc',
              },
              take: 1,
            },
          },
        },
        deliveryAddress: {
          select: {
            id: true,
            name: true,
            street1: true,
            city: true,
            state: true,
            country: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => {
      const latestPaymentTxHash = order.invoice?.payments?.[0]?.txHash ?? null;
      const network = order.invoice?.wallet?.network;
      const paymentAmount = order.paymentAmount ?? order.totalAmount;
      const paymentCurrency =
        order.paymentCurrency ?? order.invoice?.currency ?? null;

      return {
        id: order.id,
        status: order.status,
        walletAddress: order.invoice?.wallet?.address ?? null,
        amount: order.totalAmount.toString(),
        paymentAmount: paymentAmount.toString(),
        paymentCurrency,
        orderValueUsdt: order.orderValueUsdt?.toString() ?? null,
        invoiceId: order.invoiceId,
        latestPaymentTxHash,
        deliveryAddress: order.deliveryAddress,
        payout: {
          status: order.payoutStatus,
          txHash: order.payoutTxHash,
          gasFundingTxHash: order.gasFundingTxHash,
          address: order.payoutAddress,
          error: order.payoutError,
          completedAt: order.payoutCompletedAt,
        },
        network: network
          ? {
              id: network.id,
              name: network.name,
              chainId: network.chainId.toString(),
              code: network.code,
              symbol: network.symbol,
            }
          : null,
        items: order.items.map((item) => ({
          id: item.id,
          product: {
            id: item.product.id,
            name: item.product.name,
            price: item.product.price.toString(),
            currency: item.product.currency,
          },
          quantity: item.quantity,
          subtotal: item.subtotal.toString(),
        })),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };
    });
  }

  async getOrderForCustomer(customerId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        customerId,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                currency: true,
                images: {
                  select: {
                    id: true,
                    productId: true,
                    url: true,
                    type: true,
                    isPrimary: true,
                    sortOrder: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                  orderBy: [
                    { isPrimary: 'desc' },
                    { sortOrder: 'asc' },
                    { createdAt: 'asc' },
                  ],
                },
              },
            },
          },
        },
        invoice: {
          include: {
            wallet: {
              include: {
                network: true,
              },
            },
            payments: {
              select: {
                txHash: true,
                detectedAt: true,
              },
              orderBy: {
                detectedAt: 'desc',
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const network = order.invoice?.wallet?.network;
    const paymentCurrency =
      order.paymentCurrency ?? order.invoice?.currency ?? '';
    const paymentAmount = order.paymentAmount ?? order.totalAmount;
    const paymentAsset =
      network && paymentCurrency
        ? await this.tryResolveExpectedPaymentAsset(
            network,
            paymentCurrency,
            `getOrderForCustomer:order=${order.id}`,
          )
        : null;
    const walletBalances =
      network && order.invoice?.wallet?.address && paymentAsset
        ? await this.getWalletBalancesForAsset(
            network,
            order.invoice.wallet.address,
            paymentAsset,
          )
        : null;
    const detectedLatestTxHash =
      network && order.invoice?.wallet?.address && paymentAsset
        ? await this.detectLatestIncomingPaymentTxHash({
            network,
            walletAddress: order.invoice.wallet.address,
            asset: paymentAsset,
            createdAt: order.invoice?.createdAt,
          })
        : null;

    return {
      id: order.id,
      status: order.status,
      walletAddress: order.invoice?.wallet?.address ?? null,
      amount: order.totalAmount.toString(),
      paymentAmount: paymentAmount.toString(),
      paymentCurrency: paymentCurrency || null,
      orderValueUsdt: order.orderValueUsdt?.toString() ?? null,
      invoiceId: order.invoiceId,
      latestPaymentTxHash:
        order.invoice?.payments?.[0]?.txHash ?? detectedLatestTxHash ?? null,
      payout: {
        status: order.payoutStatus,
        txHash: order.payoutTxHash,
        gasFundingTxHash: order.gasFundingTxHash,
        address: order.payoutAddress,
        error: order.payoutError,
        completedAt: order.payoutCompletedAt,
      },
      network: network
        ? {
            id: network.id,
            name: network.name,
            chainId: network.chainId.toString(),
            code: network.code,
            symbol: network.symbol,
          }
        : null,
      paymentAsset: paymentAsset
        ? {
            symbol: paymentAsset.symbol,
            decimals: paymentAsset.decimals,
            isNative: paymentAsset.isNative,
            tokenAddress: paymentAsset.tokenAddress ?? null,
          }
        : null,
      walletBalances,
      currentBalance: walletBalances?.payment.balance ?? null,
      currentBalanceSymbol: walletBalances?.payment.symbol ?? null,
      gasBalance: walletBalances?.gas.balance ?? null,
      gasSymbol: walletBalances?.gas.symbol ?? null,
      items: order.items.map((item) => ({
        id: item.id,
        product: {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price.toString(),
          currency: item.product.currency,
          images: item.product.images,
        },
        quantity: item.quantity,
        subtotal: item.subtotal.toString(),
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private async tryResolveExpectedPaymentAsset(
    network: {
      id: string;
      code?: string | null;
      symbol?: string | null;
      rpcUrl: string;
    },
    currency: string,
    context: string,
  ): Promise<ExpectedPaymentAsset | null> {
    try {
      return await this.resolveExpectedPaymentAsset(network, currency);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[ORDER] Unable to resolve payment asset in ${context}. network=${network.code || network.id} currency=${currency}. ${message}`,
      );
      return null;
    }
  }

  async verifyPaymentForCustomer(
    customerId: string,
    orderId: string,
    dto: VerifyOrderPaymentDto,
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        customerId,
      },
      include: {
        invoice: {
          include: {
            wallet: {
              include: {
                network: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      !order.invoice ||
      !order.invoice.wallet ||
      !order.invoice.wallet.network
    ) {
      throw new BadRequestException('Order wallet/network is not available');
    }

    const network = order.invoice.wallet.network;
    const expectedAsset = await this.resolveExpectedPaymentAsset(
      network,
      order.invoice.currency,
    );
    const walletBalances = await this.getWalletBalancesForAsset(
      network,
      order.invoice.wallet.address,
      expectedAsset,
    );

    if (order.status === OrderStatus.PAID) {
      const payout = await this.safelySettlePaidOrder(order.id);

      return {
        status: order.status,
        paymentStatus: PaymentStatus.CONFIRMED,
        asset: {
          symbol: expectedAsset.symbol,
          tokenAddress: expectedAsset.tokenAddress ?? null,
          isTokenTransfer: !expectedAsset.isNative,
        },
        walletBalances,
        currentBalance: walletBalances.payment.balance,
        currentBalanceSymbol: walletBalances.payment.symbol,
        gasBalance: walletBalances.gas.balance,
        gasSymbol: walletBalances.gas.symbol,
        payout,
      };
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Order is not pending payment');
    }

    const providedTxHash = dto.txHash?.trim();
    const wantsAutoDetect = dto.autoDetect === true || !providedTxHash;

    if (wantsAutoDetect && !providedTxHash) {
      const detectedBalance = new Prisma.Decimal(
        walletBalances.payment.balance,
      );
      if (detectedBalance.lessThan(order.totalAmount)) {
        throw new BadRequestException(
          'Payment not detected yet. Please wait or add transaction hash manually.',
        );
      }

      const now = new Date();
      const autoTxHash = `auto-${order.id}-${Date.now()}`;

      await this.prisma.paymentTransaction.upsert({
        where: {
          networkId_txHash: {
            networkId: network.id,
            txHash: autoTxHash,
          },
        },
        create: {
          txHash: autoTxHash,
          fromAddress: 'AUTO_DETECTED',
          toAddress: order.invoice.wallet.address,
          amount: order.totalAmount,
          rawAmount: null,
          tokenId: expectedAsset.tokenId ?? null,
          tokenSymbol: expectedAsset.symbol,
          tokenAddress: expectedAsset.tokenAddress ?? null,
          isTokenTransfer: !expectedAsset.isNative,
          confirmations: dto.requiredConfirmations ?? 1,
          networkId: network.id,
          invoiceId: order.invoice.id,
          status: PaymentStatus.CONFIRMED,
          detectedAt: now,
          confirmedAt: now,
        },
        update: {
          amount: order.totalAmount,
          tokenId: expectedAsset.tokenId ?? null,
          tokenSymbol: expectedAsset.symbol,
          tokenAddress: expectedAsset.tokenAddress ?? null,
          isTokenTransfer: !expectedAsset.isNative,
          confirmations: dto.requiredConfirmations ?? 1,
          invoiceId: order.invoice.id,
          status: PaymentStatus.CONFIRMED,
          confirmedAt: now,
        },
      });

      await this.prisma.$transaction(async (tx) => {
        await tx.invoice.updateMany({
          where: {
            id: order.invoice!.id,
            status: InvoiceStatus.PENDING,
          },
          data: {
            status: InvoiceStatus.PAID,
            paidAt: now,
          },
        });

        await tx.order.updateMany({
          where: {
            id: order.id,
            status: OrderStatus.PENDING_PAYMENT,
          },
          data: {
            status: OrderStatus.PAID,
          },
        });
      });

      return {
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.CONFIRMED,
        autoDetected: true,
        txHash: autoTxHash,
        asset: {
          symbol: expectedAsset.symbol,
          tokenAddress: expectedAsset.tokenAddress ?? null,
          isTokenTransfer: !expectedAsset.isNative,
        },
        walletBalances,
        currentBalance: walletBalances.payment.balance,
        currentBalanceSymbol: walletBalances.payment.symbol,
        gasBalance: walletBalances.gas.balance,
        gasSymbol: walletBalances.gas.symbol,
        amountReceived: detectedBalance.toString(),
        amountRequired: order.totalAmount.toString(),
        payout: await this.safelySettlePaidOrder(order.id),
      };
    }

    if (!providedTxHash) {
      throw new BadRequestException(
        'txHash is required unless autoDetect=true is provided',
      );
    }

    const isTronNetwork =
      this.isTronNetwork(network.code) ||
      network.rpcUrl.toLowerCase().includes('tron');
    const txHash = isTronNetwork
      ? providedTxHash.replace(/^0x/i, '').toLowerCase()
      : providedTxHash.startsWith('0x')
        ? providedTxHash.toLowerCase()
        : providedTxHash;

    let tx;
    try {
      tx = await detectExpectedPayment({
        txHash,
        networkCode: network.code,
        rpcUrl: network.rpcUrl,
        expectedRecipient: order.invoice.wallet.address,
        expectedAsset,
      });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Unable to verify transaction',
      );
    }

    if (!tx) {
      throw new NotFoundException('Transaction not found on selected network');
    }

    if (!tx.from) {
      throw new BadRequestException('Transaction has no source address');
    }

    if (
      this.isTransactionOlderThanInvoice(tx.timestamp, order.invoice.createdAt)
    ) {
      throw new BadRequestException(
        'Transaction is older than this order invoice. Please use the latest payment transaction.',
      );
    }

    // For TRON, addresses are case-sensitive (base58). For ETH, lowercase them.
    const toAddress = isTronNetwork ? tx.to : tx.to.toLowerCase();
    const expectedAddress = isTronNetwork
      ? order.invoice.wallet.address
      : order.invoice.wallet.address.toLowerCase();

    if (toAddress !== expectedAddress) {
      throw new BadRequestException('Transaction destination address mismatch');
    }

    const paymentAmount = this.toDbAmount(tx.amountRaw, expectedAsset.decimals);

    if (paymentAmount.lessThan(order.totalAmount)) {
      throw new BadRequestException(
        'Transferred amount is lower than required order amount',
      );
    }

    const confirmations = tx.blockNumber
      ? Math.max(tx.currentBlock - tx.blockNumber + 1, 0)
      : 0;
    const requiredConfirmations = dto.requiredConfirmations ?? 1;

    const paymentStatus =
      tx.status === 1 && confirmations >= requiredConfirmations
        ? PaymentStatus.CONFIRMED
        : tx.status === 0
          ? PaymentStatus.FAILED
          : PaymentStatus.PENDING;

    const existingPayment = await this.prisma.paymentTransaction.findUnique({
      where: {
        networkId_txHash: {
          networkId: network.id,
          txHash,
        },
      },
    });

    if (
      existingPayment?.invoiceId &&
      existingPayment.invoiceId !== order.invoice.id
    ) {
      throw new BadRequestException(
        'Transaction is already linked to another invoice',
      );
    }

    const now = new Date();
    await this.prisma.paymentTransaction.upsert({
      where: {
        networkId_txHash: {
          networkId: network.id,
          txHash,
        },
      },
      create: {
        txHash,
        fromAddress: isTronNetwork ? tx.from : tx.from.toLowerCase(),
        toAddress,
        amount: paymentAmount,
        rawAmount: tx.amountRaw.toString(),
        tokenId: expectedAsset.tokenId ?? null,
        tokenSymbol: expectedAsset.symbol,
        tokenAddress: tx.tokenAddress ?? expectedAsset.tokenAddress ?? null,
        isTokenTransfer: tx.isTokenTransfer,
        confirmations,
        networkId: network.id,
        invoiceId: order.invoice.id,
        status: paymentStatus,
        detectedAt: now,
        confirmedAt: paymentStatus === PaymentStatus.CONFIRMED ? now : null,
      },
      update: {
        fromAddress: isTronNetwork ? tx.from : tx.from.toLowerCase(),
        toAddress,
        amount: paymentAmount,
        rawAmount: tx.amountRaw.toString(),
        tokenId: expectedAsset.tokenId ?? null,
        tokenSymbol: expectedAsset.symbol,
        tokenAddress: tx.tokenAddress ?? expectedAsset.tokenAddress ?? null,
        isTokenTransfer: tx.isTokenTransfer,
        confirmations,
        invoiceId: order.invoice.id,
        status: paymentStatus,
        confirmedAt: paymentStatus === PaymentStatus.CONFIRMED ? now : null,
      },
    });

    if (paymentStatus !== PaymentStatus.CONFIRMED) {
      return {
        status: order.status,
        paymentStatus,
        confirmations,
        requiredConfirmations,
        asset: {
          symbol: expectedAsset.symbol,
          tokenAddress: tx.tokenAddress ?? expectedAsset.tokenAddress ?? null,
          isTokenTransfer: tx.isTokenTransfer,
        },
        walletBalances,
        currentBalance: walletBalances.payment.balance,
        currentBalanceSymbol: walletBalances.payment.symbol,
        gasBalance: walletBalances.gas.balance,
        gasSymbol: walletBalances.gas.symbol,
        amountReceived: paymentAmount.toString(),
        amountRequired: order.totalAmount.toString(),
      };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.invoice.updateMany({
        where: {
          id: order.invoice!.id,
          status: InvoiceStatus.PENDING,
        },
        data: {
          status: InvoiceStatus.PAID,
          paidAt: now,
        },
      });

      const updatedOrder = await tx.order.updateMany({
        where: {
          id: order.id,
          status: OrderStatus.PENDING_PAYMENT,
        },
        data: {
          status: OrderStatus.PAID,
        },
      });

      return { updatedOrder };
    });

    const latestOrder =
      updated.updatedOrder.count > 0
        ? await this.prisma.order.findUnique({ where: { id: order.id } })
        : order;

    return {
      status: latestOrder?.status ?? OrderStatus.PAID,
      paymentStatus,
      confirmations,
      requiredConfirmations,
      asset: {
        symbol: expectedAsset.symbol,
        tokenAddress: tx.tokenAddress ?? expectedAsset.tokenAddress ?? null,
        isTokenTransfer: tx.isTokenTransfer,
      },
      walletBalances,
      currentBalance: walletBalances.payment.balance,
      currentBalanceSymbol: walletBalances.payment.symbol,
      gasBalance: walletBalances.gas.balance,
      gasSymbol: walletBalances.gas.symbol,
      amountReceived: paymentAmount.toString(),
      amountRequired: order.totalAmount.toString(),
      payout: await this.safelySettlePaidOrder(order.id),
    };
  }

  async listOrdersForAdminPayouts(options: {
    payoutStatus?: string;
    limit?: number;
  }) {
    const limit = this.normalizeAdminListLimit(options.limit);
    const payoutStatus = this.parsePayoutStatusFilter(options.payoutStatus);
    const where: Prisma.OrderWhereInput = {
      status: OrderStatus.PAID,
      ...(payoutStatus ? { payoutStatus } : {}),
    };

    const [total, totalPaidOrders, payoutStatusTotals, orders] =
      await Promise.all([
        this.prisma.order.count({ where }),
        this.prisma.order.count({
          where: { status: OrderStatus.PAID },
        }),
        this.prisma.order.groupBy({
          by: ['payoutStatus'],
          where: { status: OrderStatus.PAID },
          _count: { _all: true },
        }),
        this.prisma.order.findMany({
          where,
          include: {
            merchant: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            customer: {
              select: {
                id: true,
                email: true,
              },
            },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    currency: true,
                    price: true,
                  },
                },
              },
              take: 1, // Show first item for summary
            },
            invoice: {
              include: {
                wallet: {
                  include: {
                    network: true,
                  },
                },
              },
            },
          },
          orderBy: [{ updatedAt: 'desc' }],
          take: limit,
        }),
      ]);

    const payoutStatusSummary: Record<PayoutStatus, number> = {
      NOT_STARTED: 0,
      PENDING: 0,
      COMPLETED: 0,
      FAILED: 0,
    };

    for (const item of payoutStatusTotals) {
      payoutStatusSummary[item.payoutStatus] = item._count._all;
    }

    return {
      total,
      limit,
      payoutStatus: payoutStatus ?? null,
      summary: {
        totalPaidOrders,
        payoutStatus: payoutStatusSummary,
      },
      orders: orders.map((order) => ({
        id: order.id,
        status: order.status,
        amount: order.totalAmount.toString(),
        payout: this.payoutSummary(order),
        merchant: order.merchant
          ? {
              id: order.merchant.id,
              name: order.merchant.name,
              email: order.merchant.email,
            }
          : null,
        customer: order.customer
          ? {
              id: order.customer.id,
              email: order.customer.email,
            }
          : null,
        firstItem: order.items[0]
          ? {
              id: order.items[0].product.id,
              name: order.items[0].product.name,
              price: order.items[0].product.price.toString(),
              currency: order.items[0].product.currency,
            }
          : null,
        invoice: {
          id: order.invoice?.id ?? null,
          paidAt: order.invoice?.paidAt ?? null,
          walletAddress: order.invoice?.wallet?.address ?? null,
          network: order.invoice?.wallet?.network
            ? {
                id: order.invoice.wallet.network.id,
                name: order.invoice.wallet.network.name,
                chainId: order.invoice.wallet.network.chainId.toString(),
                code: order.invoice.wallet.network.code,
                symbol: order.invoice.wallet.network.symbol,
                rpcUrl: order.invoice.wallet.network.rpcUrl,
              }
            : null,
        },
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
    };
  }

  async completePaymentAsAdmin(orderId: string) {
    return this.settlePaidOrderById(orderId, undefined, true, true);
  }

  async settlePaidOrderForMerchant(merchantId: string, orderId: string) {
    return this.settlePaidOrderById(orderId, merchantId, true, false);
  }

  private async safelySettlePaidOrder(orderId: string) {
    try {
      return await this.settlePaidOrderById(orderId, undefined, false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Merchant payout failed';
      await this.markPayoutFailed(orderId, message.slice(0, 500)).catch(
        () => undefined,
      );
      return this.getPayoutSummaryByOrderId(orderId);
    }
  }

  private async settlePaidOrderById(
    orderId: string,
    merchantId?: string,
    throwOnError = true,
    forceRetry = false,
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        ...(merchantId ? { merchantId } : {}),
      },
      include: {
        invoice: {
          include: {
            wallet: {
              include: {
                network: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Order is not paid yet');
    }

    if (order.payoutStatus === PayoutStatus.COMPLETED && order.payoutTxHash) {
      return this.payoutSummary(order);
    }

    if (order.payoutStatus === PayoutStatus.PENDING && !forceRetry) {
      return this.payoutSummary(order);
    }

    if (
      !order.invoice ||
      !order.invoice.wallet ||
      !order.invoice.wallet.network
    ) {
      throw new BadRequestException('Order wallet/network is not available');
    }

    if (!order.invoice.wallet.privateKey) {
      throw new BadRequestException('Order wallet private key is missing');
    }

    const networkId = order.invoice.wallet.networkId;

    const merchantPayoutWallet =
      await this.prisma.merchantPayoutWallet.findUnique({
        where: {
          merchantId_networkId: {
            merchantId: order.merchantId,
            networkId,
          },
        },
      });

    if (!merchantPayoutWallet || !merchantPayoutWallet.isActive) {
      const message =
        'Active merchant payout wallet not configured for this network';
      await this.markPayoutFailed(order.id, message);
      if (throwOnError) {
        throw new BadRequestException(message);
      }
      return this.getPayoutSummaryByOrderId(order.id);
    }

    const adminGasWallet = await this.prisma.adminGasWallet.findUnique({
      where: { networkId },
    });

    if (!adminGasWallet || !adminGasWallet.isActive) {
      const message = 'Active admin gas wallet not configured for this network';
      await this.markPayoutFailed(order.id, message);
      if (throwOnError) {
        throw new BadRequestException(message);
      }
      return this.getPayoutSummaryByOrderId(order.id);
    }

    const payoutAsset = await this.resolveExpectedPaymentAsset(
      order.invoice.wallet.network,
      order.invoice.currency,
    );

    if (!payoutAsset.isNative && !payoutAsset.tokenAddress) {
      const message = `Token ${payoutAsset.symbol} contract address is not configured for payout`;
      await this.markPayoutFailed(order.id, message);
      if (throwOnError) {
        throw new BadRequestException(message);
      }
      return this.getPayoutSummaryByOrderId(order.id);
    }

    const payoutWalletToken = payoutAsset.tokenId
      ? await this.prisma.merchantPayoutWalletToken.findFirst({
          where: {
            walletId: merchantPayoutWallet.id,
            tokenId: payoutAsset.tokenId,
            isActive: true,
          },
        })
      : null;
    const targetPayoutAddress =
      payoutWalletToken?.receiveAddress || merchantPayoutWallet.address;
    const isTronPayoutNetwork = this.isTronNetwork(
      order.invoice.wallet.network.code,
    );
    const payoutAddress = isTronPayoutNetwork
      ? targetPayoutAddress
      : targetPayoutAddress.toLowerCase();
    const isRetryAttempt =
      order.payoutStatus === PayoutStatus.FAILED &&
      (forceRetry ||
        (this.isRetryablePayoutError(order.payoutError) &&
          !this.hasUsedSingleRetry(order.payoutError)));

    if (order.payoutStatus === PayoutStatus.FAILED && !isRetryAttempt) {
      return this.payoutSummary(order);
    }

    const normalizedPayoutAmount = new Prisma.Decimal(
      order.totalAmount.toString(),
    )
      .toDecimalPlaces(payoutAsset.decimals, Prisma.Decimal.ROUND_DOWN)
      .toString();
    let fundingTxHash: string | null = null;

    try {
      const payoutAmountRaw = parseUnits(
        normalizedPayoutAmount,
        payoutAsset.decimals,
      );

      if (payoutAmountRaw <= 0n) {
        throw new BadRequestException('Payout amount is too small to transfer');
      }

      const orderPrivateKey = decryptPrivateKey(
        order.invoice.wallet.privateKey,
      );
      const adminPrivateKey = decryptPrivateKey(adminGasWallet.privateKey);

      if (isTronPayoutNetwork) {
        return this.settlePaidTronOrder({
          order,
          payoutAddress,
          payoutAmountRaw,
          payoutAsset,
          orderPrivateKey,
          adminPrivateKey,
          throwOnError,
          forceRetry,
        });
      }

      // Use createJsonRpcProvider to prevent ethers.js from auto-detecting network and retrying infinitely
      const provider = createJsonRpcProvider(
        order.invoice.wallet.network.rpcUrl,
      );
      const orderSigner = new EthersWallet(orderPrivateKey, provider);
      const adminSigner = new EthersWallet(adminPrivateKey, provider);
      const payoutTxTemplate = payoutAsset.isNative
        ? {
            from: orderSigner.address,
            to: payoutAddress,
            value: payoutAmountRaw,
          }
        : {
            from: orderSigner.address,
            to: payoutAsset.tokenAddress!,
            value: 0n,
            data: this.encodeTokenTransferData(payoutAddress, payoutAmountRaw),
          };

      if (isRetryAttempt && !forceRetry) {
        const retryFeeConfig = payoutAsset.isNative
          ? await this.resolveTransferFeeConfig(provider)
          : await this.resolveTransferFeeConfig(provider, payoutTxTemplate);
        const retryGasCost =
          retryFeeConfig.gasLimit * retryFeeConfig.pricePerGas;
        const retryRequiredNativeBalance = payoutAsset.isNative
          ? payoutAmountRaw + retryGasCost
          : retryGasCost;
        const retryNativeBalance = await provider.getBalance(
          orderSigner.address,
        );

        if (retryNativeBalance < retryRequiredNativeBalance) {
          return this.payoutSummary(order);
        }

        if (!payoutAsset.isNative) {
          const retryTokenBalance = await this.getErc20BalanceRaw(
            provider,
            payoutAsset.tokenAddress!,
            orderSigner.address,
          );
          if (retryTokenBalance < payoutAmountRaw) {
            return this.payoutSummary(order);
          }
        }
      }

      const claimablePayoutStatuses = forceRetry
        ? [PayoutStatus.NOT_STARTED, PayoutStatus.FAILED, PayoutStatus.PENDING]
        : [PayoutStatus.NOT_STARTED, PayoutStatus.FAILED];

      const claimed = await this.prisma.order.updateMany({
        where: {
          id: order.id,
          payoutStatus: {
            in: claimablePayoutStatuses,
          },
        },
        data: {
          payoutStatus: PayoutStatus.PENDING,
          payoutError: null,
          payoutAddress,
        },
      });

      if (claimed.count === 0) {
        const latest = await this.prisma.order.findUnique({
          where: { id: order.id },
        });
        return latest ? this.payoutSummary(latest) : null;
      }

      const maxPayoutAttempts = 2;
      let payoutTxHash: string | null = null;

      for (let attempt = 1; attempt <= maxPayoutAttempts; attempt += 1) {
        const feeConfig = payoutAsset.isNative
          ? await this.resolveTransferFeeConfig(provider)
          : await this.resolveTransferFeeConfig(provider, payoutTxTemplate);
        const gasCost = feeConfig.gasLimit * feeConfig.pricePerGas;
        const GAS_BUFFER_PERCENT = 120n; // 120%

        const bufferedGasCost = (gasCost * GAS_BUFFER_PERCENT) / 100n; // add buffer of 20% extra fees injected

        const orderNativeBalance = await provider.getBalance(
          orderSigner.address,
        );
        const requiredNativeBalance = payoutAsset.isNative
          ? payoutAmountRaw + bufferedGasCost
          : bufferedGasCost;

        if (!payoutAsset.isNative) {
          const tokenBalance = await this.getErc20BalanceRaw(
            provider,
            payoutAsset.tokenAddress!,
            orderSigner.address,
          );
          if (tokenBalance < payoutAmountRaw) {
            throw new BadRequestException(
              `Insufficient ${payoutAsset.symbol} balance for payout`,
            );
          }
        }

        if (orderNativeBalance < requiredNativeBalance) {
          const deficit = requiredNativeBalance - orderNativeBalance;
          const fundingAmount = deficit;
          fundingTxHash = await this.sendFundingTxWithRetry(
            adminSigner,
            provider,
            orderSigner.address,
            fundingAmount,
          );
          const fundedBalance = await this.waitForBalanceAtLeast(
            provider,
            orderSigner.address,
            requiredNativeBalance,
          );

          if (fundedBalance < requiredNativeBalance) {
            continue;
          }
          continue;
        }

        try {
          const payoutTx = await this.sendPayoutTxWithRetry(
            orderSigner,
            provider,
            payoutAsset.isNative
              ? {
                  to: payoutAddress,
                  value: payoutAmountRaw,
                  gasLimit: feeConfig.gasLimit,
                  ...feeConfig.txOverrides,
                }
              : {
                  to: payoutAsset.tokenAddress!,
                  value: 0n,
                  data: payoutTxTemplate.data,
                  gasLimit: feeConfig.gasLimit,
                  ...feeConfig.txOverrides,
                },
          );
          const payoutReceipt = await payoutTx.wait(1);

          if (!payoutReceipt || payoutReceipt.status !== 1) {
            throw new BadRequestException('Payout transaction failed');
          }

          payoutTxHash = payoutTx.hash;
          break;
        } catch (error: any) {
          const message =
            error instanceof Error ? error.message : 'Unknown payout failure';
          const isInsufficientFunds = /insufficient funds/i.test(message);

          if (isInsufficientFunds && attempt < maxPayoutAttempts) {
            continue;
          }

          throw error;
        }
      }

      if (!payoutTxHash) {
        throw new BadRequestException(
          'Unable to complete payout after gas funding retries',
        );
      }

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          payoutStatus: PayoutStatus.COMPLETED,
          payoutTxHash,
          gasFundingTxHash: fundingTxHash,
          payoutError: null,
          payoutAddress,
          payoutCompletedAt: new Date(),
        },
      });

      return this.getPayoutSummaryByOrderId(order.id);
    } catch (error: any) {
      const message =
        error instanceof Error ? error.message : 'Unknown payout failure';
      const storedErrorMessage =
        isRetryAttempt && !forceRetry
          ? this.appendRetryMarker(message)
          : message;

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          payoutStatus: PayoutStatus.FAILED,
          payoutError: storedErrorMessage.slice(0, 500),
          payoutAddress,
          gasFundingTxHash: fundingTxHash,
        },
      });

      if (throwOnError) {
        throw new BadRequestException(message);
      }

      return this.getPayoutSummaryByOrderId(order.id);
    }
  }

  private parsePayoutStatusFilter(
    payoutStatus?: string,
  ): PayoutStatus | undefined {
    if (!payoutStatus) {
      return undefined;
    }

    const normalized = payoutStatus.trim().toUpperCase();
    if (!normalized || normalized === 'ALL') {
      return undefined;
    }

    return (Object.values(PayoutStatus) as string[]).includes(normalized)
      ? (normalized as PayoutStatus)
      : undefined;
  }

  private async settlePaidTronOrder(params: {
    order: any;
    payoutAddress: string;
    payoutAmountRaw: bigint;
    payoutAsset: ExpectedPaymentAsset;
    orderPrivateKey: string;
    adminPrivateKey: string;
    throwOnError: boolean;
    forceRetry: boolean;
  }) {
    const {
      order,
      payoutAddress,
      payoutAmountRaw,
      payoutAsset,
      orderPrivateKey,
      adminPrivateKey,
      throwOnError,
      forceRetry,
    } = params;

    const network = order.invoice.wallet.network;
    const isRetryAttempt =
      order.payoutStatus === PayoutStatus.FAILED &&
      (forceRetry ||
        (this.isRetryablePayoutError(order.payoutError) &&
          !this.hasUsedSingleRetry(order.payoutError)));

    if (order.payoutStatus === PayoutStatus.FAILED && !isRetryAttempt) {
      return this.payoutSummary(order);
    }

    const claimablePayoutStatuses = forceRetry
      ? [PayoutStatus.NOT_STARTED, PayoutStatus.FAILED, PayoutStatus.PENDING]
      : [PayoutStatus.NOT_STARTED, PayoutStatus.FAILED];

    const claimed = await this.prisma.order.updateMany({
      where: {
        id: order.id,
        payoutStatus: {
          in: claimablePayoutStatuses,
        },
      },
      data: {
        payoutStatus: PayoutStatus.PENDING,
        payoutError: null,
        payoutAddress,
      },
    });

    if (claimed.count === 0) {
      const latest = await this.prisma.order.findUnique({
        where: { id: order.id },
      });
      return latest ? this.payoutSummary(latest) : null;
    }

    let fundingTxHash: string | null = null;

    try {
      const orderWalletAddress = order.invoice.wallet.address;
      const minFeeReserve = payoutAsset.isNative ? 1_500_000n : 5_000_000n; // 1.5/5 TRX
      const requiredTrxBalance = payoutAsset.isNative
        ? payoutAmountRaw + minFeeReserve
        : minFeeReserve;

      const currentTrxBalance = await getTrxBalance(
        orderWalletAddress,
        network.rpcUrl,
        network.code || undefined,
      );

      if (!payoutAsset.isNative) {
        const tokenBalance = await getTokenBalanceRaw({
          walletAddress: orderWalletAddress,
          tokenAddress: payoutAsset.tokenAddress!,
          rpcUrl: network.rpcUrl,
          networkCode: network.code,
        });

        if (tokenBalance < payoutAmountRaw) {
          throw new BadRequestException(
            `Insufficient ${payoutAsset.symbol} balance for payout`,
          );
        }
      }

      if (currentTrxBalance < requiredTrxBalance) {
        const deficit = requiredTrxBalance - currentTrxBalance;
        fundingTxHash = await this.sendTronNativeTransaction(
          network.rpcUrl,
          adminPrivateKey,
          orderWalletAddress,
          deficit,
        );

        const fundedBalance = await this.waitForTronBalanceAtLeast(
          orderWalletAddress,
          requiredTrxBalance,
          network.rpcUrl,
          network.code || undefined,
        );

        if (fundedBalance < requiredTrxBalance) {
          throw new BadRequestException(
            'Gas funding transaction did not provide enough TRX for payout',
          );
        }
      }

      const payoutTxHash = payoutAsset.isNative
        ? await this.sendTronNativeTransaction(
            network.rpcUrl,
            orderPrivateKey,
            payoutAddress,
            payoutAmountRaw,
          )
        : await this.sendTronTokenTransaction(
            network.rpcUrl,
            orderPrivateKey,
            payoutAsset.tokenAddress!,
            payoutAddress,
            payoutAmountRaw,
          );

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          payoutStatus: PayoutStatus.COMPLETED,
          payoutTxHash,
          gasFundingTxHash: fundingTxHash,
          payoutError: null,
          payoutAddress,
          payoutCompletedAt: new Date(),
        },
      });

      return this.getPayoutSummaryByOrderId(order.id);
    } catch (error: any) {
      const message =
        error instanceof Error ? error.message : 'Unknown payout failure';
      const storedErrorMessage =
        isRetryAttempt && !forceRetry
          ? this.appendRetryMarker(message)
          : message;

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          payoutStatus: PayoutStatus.FAILED,
          payoutError: storedErrorMessage.slice(0, 500),
          payoutAddress,
          gasFundingTxHash: fundingTxHash,
        },
      });

      if (throwOnError) {
        throw new BadRequestException(message);
      }

      return this.getPayoutSummaryByOrderId(order.id);
    }
  }

  private async sendTronNativeTransaction(
    rpcUrl: string,
    privateKey: string,
    toAddress: string,
    amountSun: bigint,
  ): Promise<string> {
    const tronWeb: any = getTronWeb(rpcUrl);
    const key = privateKey.replace(/^0x/i, '');
    const fromAddress = tronWeb.address.fromPrivateKey(key);
    const amount = Number(amountSun.toString());

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Invalid TRON transfer amount');
    }

    const unsignedTx = await tronWeb.transactionBuilder.sendTrx(
      toAddress,
      amount,
      fromAddress,
    );
    const signedTx = await tronWeb.trx.sign(unsignedTx, key);
    const broadcast = await tronWeb.trx.sendRawTransaction(signedTx);

    const txHash = String(broadcast?.txid || signedTx?.txID || '').trim();
    if (!broadcast?.result || !txHash) {
      throw new BadRequestException('TRON native transfer broadcast failed');
    }

    await this.waitForTronTransactionConfirmation(tronWeb, txHash);
    return txHash;
  }

  private async sendTronTokenTransaction(
    rpcUrl: string,
    privateKey: string,
    tokenAddress: string,
    toAddress: string,
    amountRaw: bigint,
  ): Promise<string> {
    const tronWeb: any = getTronWeb(rpcUrl);
    const key = privateKey.replace(/^0x/i, '');
    tronWeb.setPrivateKey(key);

    const contract = await tronWeb.contract().at(tokenAddress);
    const txResult = await contract
      .transfer(toAddress, amountRaw.toString())
      .send({
        feeLimit: 100_000_000,
        callValue: 0,
        shouldPollResponse: false,
      });

    const txHash =
      typeof txResult === 'string'
        ? txResult
        : String(txResult?.txid || txResult?.txID || '').trim();

    if (!txHash) {
      throw new BadRequestException('TRON token transfer broadcast failed');
    }

    await this.waitForTronTransactionConfirmation(tronWeb, txHash);
    return txHash;
  }

  private async waitForTronTransactionConfirmation(
    tronWeb: any,
    txHash: string,
  ): Promise<void> {
    const maxAttempts = 40;
    const delayMs = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const txInfo = await tronWeb.trx
        .getTransactionInfo(txHash)
        .catch(() => null);

      if (txInfo) {
        const status = String(
          txInfo?.receipt?.result || txInfo?.result || '',
        ).toUpperCase();

        if (status === 'SUCCESS') {
          return;
        }

        if (status === 'FAILED' || status === 'REVERT') {
          throw new BadRequestException('TRON transaction failed on-chain');
        }
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new BadRequestException('Timed out waiting for TRON transaction');
  }

  private async waitForTronBalanceAtLeast(
    address: string,
    targetBalance: bigint,
    rpcUrl: string,
    networkCode?: string,
  ): Promise<bigint> {
    const maxAttempts = 30;
    const delayMs = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const balance = await getTrxBalance(address, rpcUrl, networkCode);
      if (balance >= targetBalance) {
        return balance;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    return getTrxBalance(address, rpcUrl, networkCode);
  }

  private normalizeAdminListLimit(limit?: number): number {
    if (typeof limit !== 'number' || Number.isNaN(limit)) {
      return 50;
    }

    return Math.min(100, Math.max(1, Math.trunc(limit)));
  }

  private async markPayoutFailed(orderId: string, message: string) {
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        payoutStatus: PayoutStatus.FAILED,
        payoutError: message.slice(0, 500),
      },
    });
  }

  private async getPayoutSummaryByOrderId(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    return order ? this.payoutSummary(order) : null;
  }

  private payoutSummary(order: any) {
    return {
      status: order.payoutStatus,
      txHash: order.payoutTxHash,
      gasFundingTxHash: order.gasFundingTxHash,
      address: order.payoutAddress,
      error: order.payoutError,
      completedAt: order.payoutCompletedAt,
    };
  }

  private isRetryablePayoutError(message?: string | null): boolean {
    if (!message) {
      return false;
    }

    return (
      /insufficient funds/i.test(message) ||
      /transferable balance is below required order amount/i.test(message) ||
      /gas/i.test(message) ||
      /nonce too low/i.test(message) ||
      /nonce has already been used/i.test(message) ||
      /nonce expired/i.test(message) ||
      /NONCE_EXPIRED/i.test(message)
    );
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

  private async sendFundingTxWithRetry(
    adminSigner: EthersWallet,
    provider: JsonRpcProvider,
    to: string,
    value: bigint,
  ): Promise<string> {
    try {
      const fundingTx = await adminSigner.sendTransaction({ to, value });
      await fundingTx.wait(1);
      return fundingTx.hash;
    } catch (error: any) {
      const message =
        error instanceof Error ? error.message : 'Unknown funding tx error';

      if (!this.isNonceConflictError(message)) {
        throw error;
      }

      const freshNonce = await provider.getTransactionCount(
        adminSigner.address,
        'pending',
      );
      const fundingTx = await adminSigner.sendTransaction({
        to,
        value,
        nonce: freshNonce,
      });
      await fundingTx.wait(1);
      return fundingTx.hash;
    }
  }

  private isNonceConflictError(message?: string | null): boolean {
    if (!message) {
      return false;
    }

    return (
      /nonce too low/i.test(message) ||
      /nonce has already been used/i.test(message) ||
      /nonce expired/i.test(message) ||
      /NONCE_EXPIRED/i.test(message)
    );
  }

  private hasUsedSingleRetry(message?: string | null): boolean {
    return Boolean(
      message && message.includes(OrdersService.RETRY_USED_MARKER),
    );
  }

  private appendRetryMarker(message: string): string {
    if (message.includes(OrdersService.RETRY_USED_MARKER)) {
      return message;
    }

    return `${message} ${OrdersService.RETRY_USED_MARKER}`;
  }

  private async resolveTransferFeeConfig(provider: JsonRpcProvider): Promise<{
    gasLimit: bigint;
    pricePerGas: bigint;
    txOverrides: {
      gasPrice?: bigint;
      maxFeePerGas?: bigint;
      maxPriorityFeePerGas?: bigint;
    };
  }>;
  private async resolveTransferFeeConfig(
    provider: JsonRpcProvider,
    txTemplate: {
      from: string;
      to: string;
      value: bigint;
      data?: string;
    },
  ): Promise<{
    gasLimit: bigint;
    pricePerGas: bigint;
    txOverrides: {
      gasPrice?: bigint;
      maxFeePerGas?: bigint;
      maxPriorityFeePerGas?: bigint;
    };
  }>;
  private async resolveTransferFeeConfig(
    provider: JsonRpcProvider,
    txTemplate?: {
      from: string;
      to: string;
      value: bigint;
      data?: string;
    },
  ): Promise<{
    gasLimit: bigint;
    pricePerGas: bigint;
    txOverrides: {
      gasPrice?: bigint;
      maxFeePerGas?: bigint;
      maxPriorityFeePerGas?: bigint;
    };
  }> {
    const fallbackGasLimit = txTemplate?.data ? 120000n : 21000n;
    let gasLimit = fallbackGasLimit;

    if (txTemplate) {
      try {
        const estimatedGas = await provider.estimateGas({
          from: txTemplate.from,
          to: txTemplate.to,
          value: txTemplate.value,
          data: txTemplate.data,
        });

        // keep headroom to avoid "intrinsic gas too low" under network volatility
        gasLimit = (estimatedGas * 120n) / 100n;
        if (gasLimit < fallbackGasLimit) {
          gasLimit = fallbackGasLimit;
        }
      } catch {
        gasLimit = fallbackGasLimit;
      }
    }

    const feeData = await provider.getFeeData();

    if (feeData.gasPrice && feeData.gasPrice > 0n) {
      return {
        gasLimit,
        pricePerGas: feeData.gasPrice,
        txOverrides: { gasPrice: feeData.gasPrice },
      };
    }

    if (
      feeData.maxFeePerGas &&
      feeData.maxPriorityFeePerGas &&
      feeData.maxFeePerGas > 0n
    ) {
      return {
        gasLimit,
        pricePerGas: feeData.maxFeePerGas,
        txOverrides: {
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        },
      };
    }

    throw new BadRequestException('Unable to resolve gas price for payout');
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

  private encodeTokenTransferData(to: string, amountRaw: bigint): string {
    return ERC20_INTERFACE.encodeFunctionData('transfer', [to, amountRaw]);
  }

  private async getErc20BalanceRaw(
    provider: JsonRpcProvider,
    tokenAddress: string,
    walletAddress: string,
  ): Promise<bigint> {
    const data = ERC20_INTERFACE.encodeFunctionData('balanceOf', [
      walletAddress,
    ]);
    const result = await provider.call({
      to: tokenAddress,
      data,
    });
    const [balance] = ERC20_INTERFACE.decodeFunctionResult('balanceOf', result);
    return BigInt(balance.toString());
  }

  private toDbAmount(value: bigint, decimals: number): Prisma.Decimal {
    const amountInNative = formatUnits(value, decimals);
    const [whole, fraction = ''] = amountInNative.split('.');
    const normalized = fraction.length
      ? `${whole}.${fraction.slice(0, 8)}`
      : whole;

    return new Prisma.Decimal(normalized);
  }

  private toEvmAddressTopic(address: string): string | null {
    const normalized = String(address || '')
      .trim()
      .toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
      return null;
    }
    const compact = normalized.slice(2);
    return `0x${compact.padStart(64, '0')}`;
  }

  private normalizeEvmAddress(value: string | null | undefined): string | null {
    const normalized = String(value || '')
      .trim()
      .toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
      return null;
    }
    return normalized;
  }

  private normalizeTronAddressHex(
    value: string | null | undefined,
    tronWeb: any,
  ): string | null {
    const normalized = String(value || '')
      .trim()
      .replace(/^0x/i, '')
      .toLowerCase();
    if (!normalized) {
      return null;
    }
    if (normalized.startsWith('41') && normalized.length === 42) {
      return normalized;
    }

    try {
      return String(tronWeb.address.toHex(String(value || '')))
        .replace(/^0x/i, '')
        .toLowerCase();
    } catch {
      return null;
    }
  }

  private isTronTxSuccessful(tx: any, txInfo: any): boolean {
    const receiptStatus = String(txInfo?.receipt?.result || '').toUpperCase();
    const contractRet = String(tx?.ret?.[0]?.contractRet || '').toUpperCase();

    if (!receiptStatus && !contractRet) {
      return true;
    }

    return receiptStatus === 'SUCCESS' || contractRet === 'SUCCESS';
  }

  private async detectLatestIncomingTronPaymentTxHash(params: {
    rpcUrl: string;
    walletAddress: string;
    asset: ExpectedPaymentAsset;
    createdAt?: Date | null;
  }): Promise<string | null> {
    const tronWeb: any = getTronWeb(params.rpcUrl);
    const recipientHex = this.normalizeTronAddressHex(
      params.walletAddress,
      tronWeb,
    );
    if (!recipientHex) {
      return null;
    }

    const tokenHex =
      !params.asset.isNative && params.asset.tokenAddress
        ? this.normalizeTronAddressHex(params.asset.tokenAddress, tronWeb)
        : null;
    const currentBlock = await tronWeb.trx.getCurrentBlock().catch(() => null);
    const currentBlockNumber = Number(
      currentBlock?.block_header?.raw_data?.number || 0,
    );

    if (!Number.isFinite(currentBlockNumber) || currentBlockNumber < 0) {
      return null;
    }

    const fromBlock = Math.max(currentBlockNumber - 300, 0);

    for (
      let blockNumber = currentBlockNumber;
      blockNumber >= fromBlock;
      blockNumber -= 1
    ) {
      const block = await tronWeb.trx
        .getBlockByNumber(blockNumber)
        .catch(() => null);
      if (!block) {
        continue;
      }

      const blockTimestampMs = Number(
        block?.block_header?.raw_data?.timestamp || 0,
      );
      if (params.createdAt) {
        const cutoffMs = params.createdAt.getTime() - 2 * 60 * 1000;
        if (
          Number.isFinite(blockTimestampMs) &&
          blockTimestampMs > 0 &&
          blockTimestampMs < cutoffMs
        ) {
          break;
        }
      }

      const transactions = Array.isArray(block.transactions)
        ? block.transactions
        : [];

      for (let index = transactions.length - 1; index >= 0; index -= 1) {
        const tx = transactions[index];
        const txHash = String(tx?.txID || tx?.txid || '')
          .trim()
          .toLowerCase();
        if (!txHash) {
          continue;
        }

        const contract = tx?.raw_data?.contract?.[0];
        if (!contract) {
          continue;
        }

        if (params.asset.isNative) {
          if (contract.type !== 'TransferContract') {
            continue;
          }

          const value = contract.parameter?.value;
          const toHex = String(value?.to_address || '').toLowerCase();
          const amountRaw = BigInt(String(value?.amount ?? '0'));
          if (toHex !== recipientHex || amountRaw <= 0n) {
            continue;
          }
        } else {
          if (contract.type !== 'TriggerSmartContract') {
            continue;
          }

          const value = contract.parameter?.value;
          const contractHex = String(
            value?.contract_address || '',
          ).toLowerCase();
          if (tokenHex && contractHex !== tokenHex) {
            continue;
          }

          const data = String(value?.data || '')
            .replace(/^0x/i, '')
            .toLowerCase();
          if (!data.startsWith('a9059cbb') || data.length < 136) {
            continue;
          }

          const toWord = data.slice(8, 72);
          const amountWord = data.slice(72, 136);
          const toHex = `41${toWord.slice(24)}`.toLowerCase();
          const amountRaw = BigInt(`0x${amountWord}`);
          if (toHex !== recipientHex || amountRaw <= 0n) {
            continue;
          }
        }

        const txInfo = await tronWeb.trx
          .getTransactionInfo(txHash)
          .catch(() => null);
        if (!this.isTronTxSuccessful(tx, txInfo)) {
          continue;
        }

        return txHash;
      }
    }

    return null;
  }

  private async isBlockAfterInvoiceCutoff(
    provider: JsonRpcProvider,
    blockNumber: number,
    createdAt?: Date | null,
  ): Promise<boolean> {
    if (!createdAt) {
      return true;
    }

    const block = await provider.getBlock(blockNumber);
    if (!block) {
      return false;
    }

    const txTimeMs = block.timestamp * 1000;
    const cutoffMs = createdAt.getTime() - 2 * 60 * 1000;
    return txTimeMs >= cutoffMs;
  }

  private async detectLatestIncomingNativePaymentTxHash(params: {
    provider: JsonRpcProvider;
    walletAddress: string;
    createdAt?: Date | null;
  }): Promise<string | null> {
    const normalizedRecipient = this.normalizeEvmAddress(params.walletAddress);
    if (!normalizedRecipient) {
      return null;
    }

    const currentBlock = await params.provider.getBlockNumber();
    const fromBlock = Math.max(currentBlock - 300, 0);

    for (
      let blockNumber = currentBlock;
      blockNumber >= fromBlock;
      blockNumber -= 1
    ) {
      const rawBlock = await params.provider.send('eth_getBlockByNumber', [
        `0x${blockNumber.toString(16)}`,
        true,
      ]);

      if (!rawBlock) {
        continue;
      }

      const rawTimestamp = Number.parseInt(
        String(rawBlock.timestamp || '0x0'),
        16,
      );
      if (params.createdAt) {
        const cutoffMs = params.createdAt.getTime() - 2 * 60 * 1000;
        if (
          Number.isFinite(rawTimestamp) &&
          rawTimestamp > 0 &&
          rawTimestamp * 1000 < cutoffMs
        ) {
          break;
        }
      }

      const transactions = Array.isArray(rawBlock.transactions)
        ? rawBlock.transactions
        : [];

      for (let index = transactions.length - 1; index >= 0; index -= 1) {
        const tx = transactions[index];
        const txHash = String(tx?.hash || '').trim();
        const txTo = this.normalizeEvmAddress(String(tx?.to || ''));
        if (!txHash || !txTo || txTo !== normalizedRecipient) {
          continue;
        }

        let txValue = 0n;
        try {
          txValue = BigInt(String(tx?.value || '0x0'));
        } catch {
          txValue = 0n;
        }
        if (txValue <= 0n) {
          continue;
        }

        const receipt = await params.provider
          .getTransactionReceipt(txHash)
          .catch(() => null);
        if (!receipt || receipt.status !== 1) {
          continue;
        }

        return txHash;
      }
    }

    return null;
  }

  private async detectLatestIncomingTokenPaymentTxHash(params: {
    provider: JsonRpcProvider;
    walletAddress: string;
    tokenAddress: string;
    createdAt?: Date | null;
  }): Promise<string | null> {
    const recipientTopic = this.toEvmAddressTopic(params.walletAddress);
    if (!recipientTopic) {
      return null;
    }

    const currentBlock = await params.provider.getBlockNumber();
    const fromBlock = Math.max(currentBlock - 5000, 0);
    const logs = await params.provider.getLogs({
      address: params.tokenAddress,
      topics: [ERC20_TRANSFER_TOPIC, null, recipientTopic],
      fromBlock,
      toBlock: currentBlock,
    });

    if (!logs.length) {
      return null;
    }

    for (let index = logs.length - 1; index >= 0; index -= 1) {
      const candidate = logs[index];
      if (!candidate.transactionHash) {
        continue;
      }

      if (
        typeof candidate.blockNumber === 'number' &&
        !(await this.isBlockAfterInvoiceCutoff(
          params.provider,
          candidate.blockNumber,
          params.createdAt,
        ))
      ) {
        continue;
      }

      return candidate.transactionHash;
    }

    return null;
  }

  private async detectLatestIncomingPaymentTxHash(params: {
    network: {
      code?: string | null;
      rpcUrl: string;
    };
    walletAddress: string;
    asset: ExpectedPaymentAsset;
    createdAt?: Date | null;
  }): Promise<string | null> {
    try {
      if (this.isTronNetwork(params.network.code)) {
        return this.detectLatestIncomingTronPaymentTxHash({
          rpcUrl: params.network.rpcUrl,
          walletAddress: params.walletAddress,
          asset: params.asset,
          createdAt: params.createdAt,
        });
      }

      const provider = createJsonRpcProvider(params.network.rpcUrl);
      if (params.asset.isNative) {
        return this.detectLatestIncomingNativePaymentTxHash({
          provider,
          walletAddress: params.walletAddress,
          createdAt: params.createdAt,
        });
      }

      if (!params.asset.tokenAddress) {
        return null;
      }

      return this.detectLatestIncomingTokenPaymentTxHash({
        provider,
        walletAddress: params.walletAddress,
        tokenAddress: params.asset.tokenAddress,
        createdAt: params.createdAt,
      });
    } catch {
      return null;
    }
  }

  private normalizePaymentSymbol(symbol: string): string {
    const normalized = String(symbol || '')
      .trim()
      .toUpperCase();
    if (normalized === 'USDT.E') return 'USDT';
    if (normalized === 'USDC.E') return 'USDC';
    return normalized;
  }

  private async convertAmountBetweenSymbols(
    amount: Prisma.Decimal,
    sourceSymbol: string,
    targetSymbol: string,
  ): Promise<Prisma.Decimal> {
    const from = this.normalizePaymentSymbol(sourceSymbol);
    const to = this.normalizePaymentSymbol(targetSymbol);

    if (!from) {
      throw new BadRequestException('Source currency is missing');
    }
    if (!to) {
      throw new BadRequestException('Target payment currency is missing');
    }
    if (from === to) {
      return amount;
    }

    const sourceUsdRate = await this.resolveUsdRateForSymbol(from);
    const targetUsdRate = await this.resolveUsdRateForSymbol(to);

    const usdValue = amount.mul(sourceUsdRate);
    const converted = usdValue.div(targetUsdRate);

    return converted.toDecimalPlaces(4, Prisma.Decimal.ROUND_UP);
  }

  private async resolveUsdRateForSymbol(
    symbol: string,
  ): Promise<Prisma.Decimal> {
    const normalized = this.normalizePaymentSymbol(symbol);
    if (OrdersService.STABLE_USD_SYMBOLS.has(normalized)) {
      return new Prisma.Decimal(1);
    }

    const cached = this.usdPriceCache.get(normalized);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const coingeckoId = OrdersService.COINGECKO_IDS_BY_SYMBOL[normalized];
    if (!coingeckoId) {
      throw new BadRequestException(
        `Currency ${normalized} is not supported for USD conversion`,
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coingeckoId)}&vs_currencies=usd`,
        {
          signal: controller.signal,
          headers: {
            accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new BadRequestException(
          `Unable to fetch conversion rate for ${normalized}`,
        );
      }

      const data = await response.json();
      const rawPrice = Number(data?.[coingeckoId]?.usd);

      if (!Number.isFinite(rawPrice) || rawPrice <= 0) {
        throw new BadRequestException(
          `Invalid conversion rate for ${normalized}`,
        );
      }

      const value = new Prisma.Decimal(rawPrice.toString());
      this.usdPriceCache.set(normalized, {
        value,
        expiresAt: Date.now() + OrdersService.PRICE_CACHE_TTL_MS,
      });

      return value;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Unable to convert ${normalized} price right now`,
      );
    } finally {
      clearTimeout(timeout);
    }
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
      throw new BadRequestException('Order currency is missing');
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

    const nativeSymbol = network.symbol?.trim().toUpperCase();
    const looksTron = this.isTronNetwork(network.code);
    const isNativeCurrency =
      normalizedCurrency === nativeSymbol ||
      normalizedCurrency === (looksTron ? 'TRX' : 'ETH');

    if (isNativeCurrency) {
      return {
        symbol: normalizedCurrency,
        decimals: looksTron ? 6 : 18,
        isNative: true,
        tokenAddress: null,
        tokenId: null,
      };
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

  private async waitForBalanceAtLeast(
    provider: JsonRpcProvider,
    address: string,
    targetBalance: bigint,
  ): Promise<bigint> {
    const maxAttempts = 30;
    const delayMs = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const balance = await provider.getBalance(address);
      if (balance >= targetBalance) {
        return balance;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    return provider.getBalance(address);
  }

  private async sendPayoutTxWithRetry(
    signer: EthersWallet,
    provider: JsonRpcProvider,
    txParams: {
      to: string;
      value: bigint;
      data?: string;
      gasLimit: bigint;
      gasPrice?: bigint;
      maxFeePerGas?: bigint;
      maxPriorityFeePerGas?: bigint;
    },
  ): Promise<any> {
    try {
      const tx = await signer.sendTransaction(txParams);
      return tx;
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (this.isNonceConflictError(message)) {
        const freshNonce = await provider.getTransactionCount(
          signer.address,
          'pending',
        );
        const tx = await signer.sendTransaction({
          ...txParams,
          nonce: freshNonce,
        });
        return tx;
      }

      throw error;
    }
  }
}
