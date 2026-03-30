import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InvoiceStatus, PaymentStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { formatEther } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';
import { encryptPrivateKey } from '../orders/wallet-encryption.util';
import { LoginSuperAdminDto } from './dto/login-super-admin.dto';
import { UpsertGasWalletDto } from './dto/upsert-gas-wallet.dto';
import { UpsertFeeWalletDto } from './dto/upsert-fee-wallet.dto';
import { UpsertNetworkTokenDto } from './dto/upsert-network-token.dto';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import {
  deriveWalletFromPrivateKey,
  generateWallet,
  isTronNetwork,
  getTrxBalance,
  sunToTrx,
} from '../blockchain/wallet.util';
import {
  executeWithRetry,
  createJsonRpcProvider,
} from '../blockchain/json-rpc.provider';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private slugifyCategoryName(name: string) {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  /*
   |--------------------------------------------------------------------------
   | LOGIN
   |--------------------------------------------------------------------------
   */
  async login(data: LoginSuperAdminDto) {
    const normalizedEmail = data.email.trim().toLowerCase();
    const maskedPassword = data.password.replace(/./g, '*');

    this.logger.log(
      `Super-admin login attempt email=${normalizedEmail} passLength=${data.password.length} maskedPass=${maskedPassword}`,
    );

    const admin = await this.prisma.adminAccount.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });

    if (!admin || !admin.isActive) {
      this.logger.warn(
        `Login failed email=${normalizedEmail} reason=not_found_or_inactive`,
      );
      throw new UnauthorizedException('Invalid email or password');
    }
    this.logger.log(
      `Super-admin password verification for adminId=${admin.id}`,
    );

    const passwordMatches = await bcrypt.compare(data.password, admin.password);

    if (!passwordMatches) {
      this.logger.warn(
        `Login failed email=${normalizedEmail} reason=wrong_password`,
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.jwtService.signAsync(
      {
        sub: admin.id,
        email: admin.email,
        role: 'super_admin',
      },
      {
        expiresIn: '7d', // recommended
      },
    );

    this.logger.log(`Login success adminId=${admin.id} tokenIssued=true`);

    return {
      accessToken,
      admin: {
        id: admin.id,
        email: admin.email,
      },
    };
  }

  /*
   |--------------------------------------------------------------------------
   | DASHBOARD (Guard-protected)
   |--------------------------------------------------------------------------
   | Now receives admin directly from request (set by Guard)
   */
  async getDashboard(admin: { id: string; email: string }, days?: number) {
    const rangeDays = days ?? 30;
    const fromDate = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);

    const [
      totalMerchants,
      activeMerchants,
      totalInvoices,
      pendingInvoices,
      paidInvoices,
      expiredInvoices,
      failedInvoices,
      paidVolumeAggregate,
      totalPayments,
      confirmedPayments,
      pendingPayments,
      failedPayments,
      networksCatalog,
      activeNetworksCatalog,
      gasWallets,
      feeWallets,
      networkPaymentGroups,
      topMerchantsRaw,
      recentPayments,
    ] = await Promise.all([
      this.prisma.merchant.count(),
      this.prisma.merchant.count({ where: { isActive: true } }),
      this.prisma.invoice.count(),
      this.prisma.invoice.count({ where: { status: InvoiceStatus.PENDING } }),
      this.prisma.invoice.count({ where: { status: InvoiceStatus.PAID } }),
      this.prisma.invoice.count({ where: { status: InvoiceStatus.EXPIRED } }),
      this.prisma.invoice.count({ where: { status: InvoiceStatus.FAILED } }),
      this.prisma.invoice.aggregate({
        where: { status: InvoiceStatus.PAID },
        _sum: { amount: true },
      }),
      this.prisma.paymentTransaction.count(),
      this.prisma.paymentTransaction.count({
        where: { status: PaymentStatus.CONFIRMED },
      }),
      this.prisma.paymentTransaction.count({
        where: { status: PaymentStatus.PENDING },
      }),
      this.prisma.paymentTransaction.count({
        where: { status: PaymentStatus.FAILED },
      }),
      this.prisma.blockchainNetwork.findMany({
        select: {
          id: true,
          name: true,
          chainId: true,
          code: true,
          symbol: true,
        },
      }),
      this.prisma.blockchainNetwork.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          chainId: true,
          code: true,
          symbol: true,
        },
        orderBy: { chainId: 'asc' },
      }),
      this.prisma.adminGasWallet.findMany({
        where: { isActive: true },
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
      }),
      this.prisma.adminFeeWallet.findMany({
        where: { isActive: true },
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
      }),
      this.prisma.paymentTransaction.groupBy({
        by: ['networkId'],
        where: { detectedAt: { gte: fromDate } },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.prisma.invoice.groupBy({
        by: ['merchantId'],
        where: {
          status: InvoiceStatus.PAID,
          paidAt: { gte: fromDate },
        },
        _count: { _all: true },
        _sum: { amount: true },
        orderBy: {
          _sum: { amount: 'desc' },
        },
        take: 5,
      }),
      this.prisma.paymentTransaction.findMany({
        where: { detectedAt: { gte: fromDate } },
        include: {
          network: {
            select: { name: true, chainId: true, code: true, symbol: true },
          },
          invoice: {
            select: {
              id: true,
              merchantId: true,
              merchant: {
                select: { name: true, email: true },
              },
            },
          },
        },
        orderBy: { detectedAt: 'desc' },
        take: 10,
      }),
    ]);

    const networkLookup = new Map(
      networksCatalog.map((network) => [network.id, network] as const),
    );
    const activeNetworkIds = new Set(activeNetworksCatalog.map((n) => n.id));
    const gasWalletByNetwork = new Map(
      gasWallets.map((wallet) => [wallet.networkId, wallet] as const),
    );
    const feeWalletByNetwork = new Map(
      feeWallets.map((wallet) => [wallet.networkId, wallet] as const),
    );

    const missingGasNetworks = activeNetworksCatalog.filter(
      (network) => !gasWalletByNetwork.has(network.id),
    );
    const missingFeeNetworks = activeNetworksCatalog.filter(
      (network) => !feeWalletByNetwork.has(network.id),
    );
    const configuredGasWallets = gasWallets
      .filter((wallet) => activeNetworkIds.has(wallet.networkId))
      .map((wallet) => ({
        walletType: 'GAS' as const,
        id: wallet.id,
        networkId: wallet.networkId,
        address: wallet.address,
        network: {
          ...wallet.network,
          chainId: wallet.network.chainId.toString(),
        },
      }));
    const configuredFeeWallets = feeWallets
      .filter((wallet) => activeNetworkIds.has(wallet.networkId))
      .map((wallet) => ({
        walletType: 'FEE' as const,
        id: wallet.id,
        networkId: wallet.networkId,
        address: wallet.address,
        network: {
          ...wallet.network,
          chainId: wallet.network.chainId.toString(),
        },
      }));
    const serializedMissingGasNetworks = missingGasNetworks.map((network) => ({
      ...network,
      chainId: network.chainId.toString(),
    }));
    const serializedMissingFeeNetworks = missingFeeNetworks.map((network) => ({
      ...network,
      chainId: network.chainId.toString(),
    }));

    return {
      admin,
      rangeDays,
      metrics: {
        merchants: {
          total: totalMerchants,
          active: activeMerchants,
          inactive: totalMerchants - activeMerchants,
        },
        invoices: {
          total: totalInvoices,
          pending: pendingInvoices,
          paid: paidInvoices,
          expired: expiredInvoices,
          failed: failedInvoices,
        },
        payments: {
          total: totalPayments,
          confirmed: confirmedPayments,
          pending: pendingPayments,
          failed: failedPayments,
        },
        paidVolume: this.decimalToString(paidVolumeAggregate._sum.amount),
        wallets: {
          gasConfigured: configuredGasWallets.length,
          feeConfigured: configuredFeeWallets.length,
          expected: activeNetworksCatalog.length,
        },
      },
      // Backward-friendly aliases for dashboard clients
      gasWallets: configuredGasWallets,
      feeWallets: configuredFeeWallets,
      missingGasNetworks: serializedMissingGasNetworks,
      missingFeeNetworks: serializedMissingFeeNetworks,
      wallets: {
        gas: {
          title: 'Gas Wallets',
          configuredCount: configuredGasWallets.length,
          expectedCount: activeNetworksCatalog.length,
          missingCount: missingGasNetworks.length,
          health: missingGasNetworks.length === 0 ? 'HEALTHY' : 'INCOMPLETE',
          configured: configuredGasWallets,
          missingNetworks: serializedMissingGasNetworks,
        },
        fee: {
          title: 'Fee Wallets',
          configuredCount: configuredFeeWallets.length,
          expectedCount: activeNetworksCatalog.length,
          missingCount: missingFeeNetworks.length,
          health: missingFeeNetworks.length === 0 ? 'HEALTHY' : 'INCOMPLETE',
          configured: configuredFeeWallets,
          missingNetworks: serializedMissingFeeNetworks,
        },
      },
      networkBreakdown: networkPaymentGroups.map((group) => {
        const network = networkLookup.get(group.networkId);
        return {
          networkId: group.networkId,
          network: network
            ? {
                ...network,
                chainId: network.chainId.toString(),
              }
            : null,
          paymentCount: group._count._all,
          paymentVolume: this.decimalToString(group._sum.amount),
        };
      }),
      topMerchants: topMerchantsRaw.map((entry) => ({
        merchantId: entry.merchantId,
        paidInvoiceCount: entry._count._all,
        paidInvoiceVolume: this.decimalToString(entry._sum.amount),
      })),
      recentPayments: recentPayments.map((payment) => ({
        id: payment.id,
        txHash: payment.txHash,
        amount: this.decimalToString(payment.amount),
        status: payment.status,
        confirmations: payment.confirmations,
        detectedAt: payment.detectedAt,
        network: payment.network
          ? {
              ...payment.network,
              chainId: payment.network.chainId.toString(),
            }
          : null,
        invoice: payment.invoice
          ? {
              id: payment.invoice.id,
              merchantId: payment.invoice.merchantId,
              merchantName: payment.invoice.merchant.name,
              merchantEmail: payment.invoice.merchant.email,
            }
          : null,
      })),
    };
  }

  async listProductCategories(includeInactive = true) {
    return this.prisma.productCategory.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async createProductCategory(dto: CreateProductCategoryDto) {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Category name is required');
    }

    const slug = this.slugifyCategoryName(name);
    if (!slug) {
      throw new BadRequestException('Category name is invalid');
    }

    const existingBySlug = await this.prisma.productCategory.findUnique({
      where: { slug },
    });

    if (existingBySlug) {
      return this.prisma.productCategory.update({
        where: { id: existingBySlug.id },
        data: {
          name,
          isActive: true,
        },
      });
    }

    return this.prisma.productCategory.create({
      data: {
        name,
        slug,
      },
    });
  }

  async deleteProductCategory(categoryId: string) {
    const existing = await this.prisma.productCategory.findUnique({
      where: { id: categoryId },
    });

    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    return this.prisma.productCategory.update({
      where: { id: categoryId },
      data: { isActive: false },
    });
  }

  private decimalToString(value: Prisma.Decimal | null | undefined): string {
    return value ? value.toString() : '0';
  }

  async getAdminWalletOverview() {
    const [gasWallets, feeWallets] = await Promise.all([
      this.listGasWallets(),
      this.listFeeWallets(),
    ]);

    return {
      gasWallets,
      feeWallets,
    };
  }

  async listNetworkTokens(networkId: string) {
    const network = await this.prisma.blockchainNetwork.findUnique({
      where: { id: networkId },
      select: {
        id: true,
        name: true,
        chainId: true,
        code: true,
        symbol: true,
        isActive: true,
      },
    });

    if (!network) {
      throw new NotFoundException('Network not found');
    }

    await this.ensureDefaultNetworkTokens(network);

    const tokens = await this.prisma.networkToken.findMany({
      where: { networkId },
      orderBy: [{ isNative: 'desc' }, { symbol: 'asc' }],
    });

    return {
      network: {
        ...network,
        chainId: network.chainId.toString(),
      },
      tokens: tokens.map((token) => ({
        id: token.id,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        contractAddress: token.contractAddress,
        isNative: token.isNative,
        isActive: token.isActive,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
      })),
    };
  }

  async upsertNetworkToken(
    networkId: string,
    symbolParam: string,
    dto: UpsertNetworkTokenDto,
  ) {
    const network = await this.prisma.blockchainNetwork.findUnique({
      where: { id: networkId },
      select: {
        id: true,
        name: true,
        chainId: true,
        code: true,
        symbol: true,
        isActive: true,
      },
    });

    if (!network) {
      throw new NotFoundException('Network not found');
    }

    const symbol = (symbolParam || dto.symbol || '').trim().toUpperCase();
    if (!symbol) {
      throw new BadRequestException('Token symbol is required');
    }

    const isNative = Boolean(dto.isNative);
    const contractAddress = isNative
      ? null
      : this.normalizeTokenContractAddressForNetwork(
          dto.contractAddress?.trim() || null,
          network,
        );

    if (!isNative && !contractAddress) {
      throw new BadRequestException(
        'contractAddress is required for non-native tokens',
      );
    }

    const saved = await this.prisma.networkToken.upsert({
      where: {
        networkId_symbol: {
          networkId,
          symbol,
        },
      },
      update: {
        name: dto.name.trim(),
        decimals: dto.decimals,
        contractAddress,
        isNative,
        isActive: dto.isActive ?? true,
      },
      create: {
        networkId,
        symbol,
        name: dto.name.trim(),
        decimals: dto.decimals,
        contractAddress,
        isNative,
        isActive: dto.isActive ?? true,
      },
    });

    const activeWallets = await this.prisma.merchantPayoutWallet.findMany({
      where: {
        networkId,
        isActive: true,
      },
      select: {
        id: true,
        address: true,
      },
    });

    for (const wallet of activeWallets) {
      await this.prisma.merchantPayoutWalletToken.upsert({
        where: {
          walletId_tokenId: {
            walletId: wallet.id,
            tokenId: saved.id,
          },
        },
        update: {
          receiveAddress: wallet.address,
          isActive: true,
        },
        create: {
          walletId: wallet.id,
          tokenId: saved.id,
          receiveAddress: wallet.address,
          isActive: true,
        },
      });
    }

    return {
      id: saved.id,
      networkId: saved.networkId,
      symbol: saved.symbol,
      name: saved.name,
      decimals: saved.decimals,
      contractAddress: saved.contractAddress,
      isNative: saved.isNative,
      isActive: saved.isActive,
      network: {
        ...network,
        chainId: network.chainId.toString(),
      },
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async deactivateNetworkToken(networkId: string, symbolParam: string) {
    const symbol = (symbolParam || '').trim().toUpperCase();
    if (!symbol) {
      throw new BadRequestException('Token symbol is required');
    }

    const token = await this.prisma.networkToken.findFirst({
      where: {
        networkId,
        symbol,
      },
    });

    if (!token) {
      throw new NotFoundException('Token not found for network');
    }

    const saved = await this.prisma.networkToken.update({
      where: { id: token.id },
      data: {
        isActive: false,
      },
    });

    await this.prisma.merchantPayoutWalletToken.updateMany({
      where: {
        tokenId: token.id,
      },
      data: {
        isActive: false,
      },
    });

    return {
      id: saved.id,
      networkId: saved.networkId,
      symbol: saved.symbol,
      isActive: saved.isActive,
      updatedAt: saved.updatedAt,
    };
  }

  async listGasWallets() {
    const wallets = await this.prisma.adminGasWallet.findMany({
      include: {
        network: {
          select: {
            id: true,
            name: true,
            chainId: true,
            isActive: true,
            symbol: true,
            code: true,
            rpcUrl: true,
          },
        },
      },
      orderBy: {
        network: {
          chainId: 'asc',
        },
      },
    });

    return wallets.map((wallet) => ({
      walletType: 'GAS' as const,
      id: wallet.id,
      networkId: wallet.networkId,
      address: wallet.address,
      isActive: wallet.isActive,
      network: {
        ...wallet.network,
        chainId: wallet.network.chainId.toString(),
      },
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    }));
  }

  async upsertGasWallet(dto: UpsertGasWalletDto) {
    const network = await this.prisma.blockchainNetwork.findUnique({
      where: { id: dto.networkId },
      select: {
        id: true,
        name: true,
        chainId: true,
        isActive: true,
        code: true,
        symbol: true,
      },
    });

    if (!network) {
      throw new NotFoundException('Network not found');
    }

    if (!network.isActive) {
      throw new BadRequestException('Network is inactive');
    }

    const wallet = this.resolveAdminWalletForNetwork(network, dto.privateKey);

    const saved = await this.prisma.adminGasWallet.upsert({
      where: { networkId: dto.networkId },
      update: {
        address: wallet.address,
        privateKey: encryptPrivateKey(wallet.privateKey),
        isActive: true,
      },
      create: {
        networkId: dto.networkId,
        address: wallet.address,
        privateKey: encryptPrivateKey(wallet.privateKey),
        isActive: true,
      },
    });

    return {
      id: saved.id,
      networkId: saved.networkId,
      address: saved.address,
      isActive: saved.isActive,
      network: {
        ...network,
        chainId: network.chainId.toString(),
      },
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async bootstrapGasWallets() {
    const activeNetworks = await this.prisma.blockchainNetwork.findMany({
      where: { isActive: true },
      select: { id: true, name: true, chainId: true, code: true, symbol: true },
      orderBy: { chainId: 'asc' },
    });

    const created: Array<{
      networkId: string;
      chainId: string;
      name: string;
      symbol: string;
      address: string;
    }> = [];

    for (const network of activeNetworks) {
      const existing = await this.prisma.adminGasWallet.findUnique({
        where: { networkId: network.id },
      });

      if (existing) {
        if (this.walletAddressMatchesNetwork(existing.address, network)) {
          continue;
        }

        const repairedWallet = this.resolveAdminWalletForNetwork(network);
        await this.prisma.adminGasWallet.update({
          where: { networkId: network.id },
          data: {
            address: repairedWallet.address,
            privateKey: encryptPrivateKey(repairedWallet.privateKey),
            isActive: true,
          },
        });

        created.push({
          networkId: network.id,
          chainId: network.chainId.toString(),
          name: network.name,
          symbol: network.symbol || network.code || 'ETH',
          address: repairedWallet.address,
        });
        continue;
      }

      const wallet = this.resolveAdminWalletForNetwork(network);

      await this.prisma.adminGasWallet.create({
        data: {
          networkId: network.id,
          address: wallet.address,
          privateKey: encryptPrivateKey(wallet.privateKey),
          isActive: true,
        },
      });

      created.push({
        networkId: network.id,
        chainId: network.chainId.toString(),
        name: network.name,
        symbol: network.symbol || network.code || 'ETH',
        address: wallet.address,
      });
    }

    return {
      totalActiveNetworks: activeNetworks.length,
      createdCount: created.length,
      created,
    };
  }

  /*
   |--------------------------------------------------------------------------
   | ADMIN FEE WALLETS
   |--------------------------------------------------------------------------
   */
  async listFeeWallets() {
    const wallets = await this.prisma.adminFeeWallet.findMany({
      include: {
        network: {
          select: {
            id: true,
            name: true,
            chainId: true,
            isActive: true,
            symbol: true,
            code: true,
            rpcUrl: true,
          },
        },
      },
      orderBy: {
        network: {
          chainId: 'asc',
        },
      },
    });

    return wallets.map((wallet) => ({
      walletType: 'FEE' as const,
      id: wallet.id,
      networkId: wallet.networkId,
      address: wallet.address,
      isActive: wallet.isActive,
      network: {
        ...wallet.network,
        chainId: wallet.network.chainId.toString(),
      },
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    }));
  }

  async upsertFeeWallet(dto: UpsertFeeWalletDto) {
    const network = await this.prisma.blockchainNetwork.findUnique({
      where: { id: dto.networkId },
      select: {
        id: true,
        name: true,
        chainId: true,
        isActive: true,
        code: true,
        symbol: true,
      },
    });

    if (!network) {
      throw new NotFoundException('Network not found');
    }

    if (!network.isActive) {
      throw new BadRequestException('Network is inactive');
    }

    const wallet = this.resolveAdminWalletForNetwork(network, dto.privateKey);

    const saved = await this.prisma.adminFeeWallet.upsert({
      where: { networkId: dto.networkId },
      update: {
        address: wallet.address,
        privateKey: encryptPrivateKey(wallet.privateKey),
        isActive: true,
      },
      create: {
        networkId: dto.networkId,
        address: wallet.address,
        privateKey: encryptPrivateKey(wallet.privateKey),
        isActive: true,
      },
    });

    return {
      id: saved.id,
      networkId: saved.networkId,
      address: saved.address,
      isActive: saved.isActive,
      network: {
        ...network,
        chainId: network.chainId.toString(),
      },
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async bootstrapFeeWallets() {
    const activeNetworks = await this.prisma.blockchainNetwork.findMany({
      where: { isActive: true },
      select: { id: true, name: true, chainId: true, code: true, symbol: true },
      orderBy: { chainId: 'asc' },
    });

    const created: Array<{
      networkId: string;
      chainId: string;
      name: string;
      symbol: string;
      address: string;
    }> = [];

    for (const network of activeNetworks) {
      const existing = await this.prisma.adminFeeWallet.findUnique({
        where: { networkId: network.id },
      });

      if (existing) {
        if (this.walletAddressMatchesNetwork(existing.address, network)) {
          continue;
        }

        const repairedWallet = this.resolveAdminWalletForNetwork(network);
        await this.prisma.adminFeeWallet.update({
          where: { networkId: network.id },
          data: {
            address: repairedWallet.address,
            privateKey: encryptPrivateKey(repairedWallet.privateKey),
            isActive: true,
          },
        });

        created.push({
          networkId: network.id,
          chainId: network.chainId.toString(),
          name: network.name,
          symbol: network.symbol || network.code || 'ETH',
          address: repairedWallet.address,
        });
        continue;
      }

      const wallet = this.resolveAdminWalletForNetwork(network);

      await this.prisma.adminFeeWallet.create({
        data: {
          networkId: network.id,
          address: wallet.address,
          privateKey: encryptPrivateKey(wallet.privateKey),
          isActive: true,
        },
      });

      created.push({
        networkId: network.id,
        chainId: network.chainId.toString(),
        name: network.name,
        symbol: network.symbol || network.code || 'ETH',
        address: wallet.address,
      });
    }

    return {
      totalActiveNetworks: activeNetworks.length,
      createdCount: created.length,
      created,
    };
  }

  /*
   |--------------------------------------------------------------------------
   | WALLET BALANCES (with native token balance)
   |--------------------------------------------------------------------------
   */
  async getGasWalletBalances() {
    const wallets = await this.prisma.adminGasWallet.findMany({
      include: {
        network: {
          select: {
            id: true,
            name: true,
            chainId: true,
            isActive: true,
            symbol: true,
            code: true,
            rpcUrl: true,
          },
        },
      },
      orderBy: {
        network: {
          chainId: 'asc',
        },
      },
    });

    const balances = await Promise.all(
      wallets.map(async (wallet) => {
        const nativeBalance = await this.getNativeBalance(
          wallet.address,
          wallet.network.code,
          wallet.network.rpcUrl,
          wallet.network.symbol,
        );

        return {
          walletType: 'GAS' as const,
          id: wallet.id,
          networkId: wallet.networkId,
          address: wallet.address,
          isActive: wallet.isActive,
          network: {
            ...wallet.network,
            chainId: wallet.network.chainId.toString(),
          },
          nativeBalance: nativeBalance,
          createdAt: wallet.createdAt,
          updatedAt: wallet.updatedAt,
        };
      }),
    );

    return balances;
  }

  async getFeeWalletBalances() {
    const wallets = await this.prisma.adminFeeWallet.findMany({
      include: {
        network: {
          select: {
            id: true,
            name: true,
            chainId: true,
            isActive: true,
            symbol: true,
            code: true,
            rpcUrl: true,
          },
        },
      },
      orderBy: {
        network: {
          chainId: 'asc',
        },
      },
    });

    const balances = await Promise.all(
      wallets.map(async (wallet) => {
        const nativeBalance = await this.getNativeBalance(
          wallet.address,
          wallet.network.code,
          wallet.network.rpcUrl,
          wallet.network.symbol,
        );

        return {
          walletType: 'FEE' as const,
          id: wallet.id,
          networkId: wallet.networkId,
          address: wallet.address,
          isActive: wallet.isActive,
          network: {
            ...wallet.network,
            chainId: wallet.network.chainId.toString(),
          },
          nativeBalance: nativeBalance,
          createdAt: wallet.createdAt,
          updatedAt: wallet.updatedAt,
        };
      }),
    );

    return balances;
  }

  /**
   * Get native token balance for a wallet
   * For TRON networks, uses TronWeb to get TRX balance
   * For other networks, uses ethers.js to get native token balance
   * With retry logic (3 attempts) for JSON RPC failures
   */
  private async getNativeBalance(
    address: string,
    networkCode: string | null,
    rpcUrl: string,
    networkSymbol?: string | null,
  ): Promise<{ balance: string; symbol: string }> {
    const normalizedCode = networkCode?.trim().toUpperCase();
    const isTronChain =
      isTronNetwork(normalizedCode || '') ||
      (normalizedCode ? normalizedCode.includes('TRON') : false) ||
      rpcUrl.toLowerCase().includes('tron');
    const symbol = isTronChain
      ? 'TRX'
      : networkSymbol?.trim().toUpperCase() || 'ETH';

    try {
      if (isTronChain) {
        // Use TronWeb for TRON networks (with retry logic via wallet.util.ts)
        const balanceSun = await getTrxBalance(
          address,
          rpcUrl,
          normalizedCode || undefined,
        );
        return {
          balance: sunToTrx(balanceSun),
          symbol: 'TRX',
        };
      } else {
        // Use ethers.js with retry logic for other networks
        const balanceWei = await executeWithRetry(
          `getBalance(${address})`,
          async () => {
            const provider = createJsonRpcProvider(rpcUrl);
            return provider.getBalance(address);
          },
          networkCode || undefined,
        );
        return {
          balance: formatEther(balanceWei),
          symbol: symbol,
        };
      }
    } catch (error) {
      this.logger.error(
        `Failed to get native balance for address ${address}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        balance: '0',
        symbol: symbol,
      };
    }
  }

  private resolveAdminWalletForNetwork(
    network: {
      code?: string | null;
      chainId?: bigint | null;
      symbol?: string | null;
    },
    privateKey?: string,
  ): { address: string; privateKey: string } {
    const walletCode = this.resolveWalletCode(network);
    const wallet = privateKey
      ? deriveWalletFromPrivateKey(walletCode, privateKey)
      : generateWallet(walletCode);

    return this.isTronNetworkContext(network)
      ? {
          address: wallet.address,
          privateKey: wallet.privateKey,
        }
      : {
          address: wallet.address.toLowerCase(),
          privateKey: wallet.privateKey,
        };
  }

  private resolveWalletCode(network: {
    code?: string | null;
    chainId?: bigint | null;
    symbol?: string | null;
  }): string {
    if (network.code && network.code.trim().length > 0) {
      return network.code.trim().toUpperCase();
    }

    if (this.isTronNetworkContext(network)) {
      return 'TRON';
    }

    return 'ETH';
  }

  private isTronNetworkContext(network: {
    code?: string | null;
    chainId?: bigint | null;
    symbol?: string | null;
  }): boolean {
    if (isTronNetwork(network.code || '')) {
      return true;
    }

    if (network.symbol?.toUpperCase() === 'TRX') {
      return true;
    }

    const chainId = network.chainId?.toString();
    return chainId === '728126428' || chainId === '3448148188';
  }

  private walletAddressMatchesNetwork(
    address: string,
    network: {
      code?: string | null;
      chainId?: bigint | null;
      symbol?: string | null;
    },
  ): boolean {
    if (this.isTronNetworkContext(network)) {
      return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
    }

    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  private normalizeTokenContractAddressForNetwork(
    contractAddress: string | null,
    network: {
      code?: string | null;
      chainId?: bigint | null;
      symbol?: string | null;
    },
  ): string | null {
    if (!contractAddress) {
      return null;
    }

    const value = contractAddress.trim();
    if (!value) {
      return null;
    }

    if (this.isTronNetworkContext(network)) {
      if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value)) {
        throw new BadRequestException(
          'TRON token contractAddress must be a valid base58 TRON address',
        );
      }
      return value;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
      throw new BadRequestException(
        'EVM token contractAddress must be a valid 0x address',
      );
    }

    return value.toLowerCase();
  }

  private async ensureDefaultNetworkTokens(network: {
    id: string;
    code?: string | null;
    symbol?: string | null;
  }) {
    const normalizedCode = network.code?.trim().toUpperCase() || '';
    const nativeSymbol =
      network.symbol?.trim().toUpperCase() ||
      (normalizedCode.includes('TRON') ? 'TRX' : 'ETH');
    const nativeDecimals = normalizedCode.includes('TRON') ? 6 : 18;

    await this.prisma.networkToken.upsert({
      where: {
        networkId_symbol: {
          networkId: network.id,
          symbol: nativeSymbol,
        },
      },
      update: {
        name: `${nativeSymbol} Native`,
        decimals: nativeDecimals,
        contractAddress: null,
        isNative: true,
        isActive: true,
      },
      create: {
        networkId: network.id,
        symbol: nativeSymbol,
        name: `${nativeSymbol} Native`,
        decimals: nativeDecimals,
        contractAddress: null,
        isNative: true,
        isActive: true,
      },
    });
  }
}
