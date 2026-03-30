import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { InvoiceStatus, Prisma } from '@prisma/client';
import { formatEther } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { LoginMerchantDto } from './dto/login-merchant.dto';
import {
  CreateProductDto,
  ProductImageDto,
  ProductImageType,
} from './dto/create-product.dto';
import { UpdateProductInventoryDto } from './dto/update-product-inventory.dto';
import { UpsertPayoutWalletDto } from './dto/upsert-payout-wallet.dto';
import {
  createJsonRpcProvider,
  executeWithRetry,
} from '../blockchain/json-rpc.provider';
import {
  getTrxBalance,
  isTronNetwork,
  sunToTrx,
} from '../blockchain/wallet.util';
import {
  formatRawTokenAmount,
  getTokenBalanceRaw,
} from '../blockchain/token-balance.util';

@Injectable()
export class MerchantService {
  private readonly logger = new Logger(MerchantService.name);

  constructor(
    private prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private normalizeProductPricing(dto: CreateProductDto) {
    const salePriceRaw = dto.salePrice ?? dto.price;
    if (!salePriceRaw) {
      throw new BadRequestException('Either salePrice or price is required');
    }

    const salePrice = new Prisma.Decimal(salePriceRaw);
    const mrp = new Prisma.Decimal(dto.mrp ?? salePriceRaw);
    const deliveryFee = new Prisma.Decimal(dto.deliveryFee ?? '0');

    if (mrp.lessThan(salePrice)) {
      throw new BadRequestException(
        'MRP must be greater than or equal to salePrice',
      );
    }

    if (salePrice.lessThan(0) || mrp.lessThan(0) || deliveryFee.lessThan(0)) {
      throw new BadRequestException('Price values cannot be negative');
    }

    return { salePrice, mrp, deliveryFee };
  }

  private async validateCategoryIds(categoryIds: string[]) {
    if (!categoryIds.length) {
      return;
    }

    const uniqueCategoryIds = [...new Set(categoryIds)];
    const categories = await this.prisma.productCategory.findMany({
      where: {
        id: { in: uniqueCategoryIds },
        isActive: true,
      },
      select: { id: true },
    });

    if (categories.length !== uniqueCategoryIds.length) {
      throw new BadRequestException(
        'One or more selected categories are invalid or inactive',
      );
    }
  }

  private normalizeInventoryValues(input: {
    quantity?: number;
    lowStockThreshold?: number;
  }) {
    const normalizedQuantity =
      typeof input.quantity === 'number'
        ? Math.max(0, Math.trunc(input.quantity))
        : 0;
    const normalizedLowStockThreshold =
      typeof input.lowStockThreshold === 'number'
        ? Math.max(0, Math.trunc(input.lowStockThreshold))
        : 5;

    return {
      quantity: normalizedQuantity,
      lowStockThreshold: normalizedLowStockThreshold,
    };
  }

  private mapProductResponse(product: any) {
    const quantity = Number(product.quantity || 0);
    const lowStockThreshold = Number(product.lowStockThreshold || 0);

    return {
      ...product,
      price: product.price.toString(),
      salePrice: product.salePrice.toString(),
      mrp: product.mrp.toString(),
      deliveryFee: product.deliveryFee.toString(),
      quantity,
      lowStockThreshold,
      inventoryStatus:
        quantity <= 0
          ? 'OUT_OF_STOCK'
          : quantity <= lowStockThreshold
            ? 'LOW_STOCK'
            : 'IN_STOCK',
      stockActions: {
        updateInventory: `/merchant/products/${product.id}/inventory`,
        manageStock: `/merchant/products/${product.id}/manage-stock`,
      },
    };
  }

  private async getLowStockAlerts(merchantId: string) {
    const products = await this.prisma.product.findMany({
      where: { merchantId },
      select: {
        id: true,
        name: true,
        quantity: true,
        lowStockThreshold: true,
        updatedAt: true,
      },
      orderBy: [{ quantity: 'asc' }, { updatedAt: 'desc' }],
    });

    return products
      .filter((product) => product.quantity <= product.lowStockThreshold)
      .map((product) => ({
        productId: product.id,
        productName: product.name,
        quantity: product.quantity,
        lowStockThreshold: product.lowStockThreshold,
        level: product.quantity <= 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
        message:
          product.quantity <= 0
            ? `${product.name} is out of stock`
            : `${product.name} is low on stock (${product.quantity} left)`,
        updatedAt: product.updatedAt,
      }));
  }

  // =====================================================
  // MERCHANT AUTH
  // =====================================================

  async register(data: CreateMerchantDto) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const apiKey = randomBytes(32).toString('hex');

    try {
      return await this.prisma.merchant.create({
        data: {
          email: data.email.toLowerCase(),
          name: data.name,
          password: hashedPassword,
          apiKey,
        },
        select: {
          id: true,
          email: true,
          name: true,
          apiKey: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  async login(data: LoginMerchantDto) {
    const normalizedEmail = data.email.trim().toLowerCase();

    const merchant = await this.prisma.merchant.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });

    if (!merchant || !merchant.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      data.password,
      merchant.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: merchant.id,
      role: 'MERCHANT',
    });

    return {
      accessToken,
      merchant: {
        id: merchant.id,
        email: merchant.email,
        name: merchant.name,
      },
    };
  }

  // =====================================================
  // DASHBOARD (JWT BASED)
  // =====================================================

  async getDashboard(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant || !merchant.isActive) {
      throw new UnauthorizedException();
    }

    const [
      totalInvoices,
      paidVolumeAggregate,
      payoutWallets,
      activeNetworks,
      lowStockAlerts,
    ] = await Promise.all([
      this.prisma.invoice.count({
        where: { merchantId },
      }),
      this.prisma.invoice.aggregate({
        where: {
          merchantId,
          status: InvoiceStatus.PAID,
        },
        _sum: { amount: true },
      }),
      this.prisma.merchantPayoutWallet.findMany({
        where: { merchantId },
        include: {
          network: {
            select: {
              id: true,
              name: true,
              chainId: true,
              isActive: true,
              code: true,
              symbol: true,
              rpcUrl: true,
            },
          },
        },
        orderBy: {
          network: { chainId: 'asc' },
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
      this.getLowStockAlerts(merchantId),
    ]);

    const payoutWalletsWithBalance = await Promise.all(
      payoutWallets.map(async (wallet) => {
        const balances = await this.getWalletAssetBalances(
          wallet.id,
          wallet.address,
          wallet.network,
        );
        const nativeBalance = balances.find((asset) => asset.isNative)
          ?.balanceEntry || {
          balance: '0',
          symbol: wallet.network.symbol || 'NATIVE',
        };

        return {
          id: wallet.id,
          networkId: wallet.networkId,
          address: wallet.address,
          label: wallet.label,
          isActive: wallet.isActive,
          network: {
            id: wallet.network.id,
            name: wallet.network.name,
            chainId: wallet.network.chainId.toString(),
            isActive: wallet.network.isActive,
            code: wallet.network.code,
            symbol: wallet.network.symbol,
          },
          balances: balances.map((asset) => asset.balanceEntry),
          nativeBalance,
        };
      }),
    );

    return {
      merchant: {
        id: merchant.id,
        name: merchant.name,
        email: merchant.email,
      },
      metrics: {
        invoices: totalInvoices,
        paidVolume: this.decimalToString(paidVolumeAggregate._sum.amount),
        lowStockItems: lowStockAlerts.filter(
          (alert) => alert.level === 'LOW_STOCK',
        ).length,
        outOfStockItems: lowStockAlerts.filter(
          (alert) => alert.level === 'OUT_OF_STOCK',
        ).length,
      },
      inventoryNotifications: lowStockAlerts,
      payoutWallets: payoutWalletsWithBalance,
      activeNetworks: activeNetworks.map((network) => ({
        ...network,
        chainId: network.chainId.toString(),
      })),
    };
  }

  // =====================================================
  // PRODUCT CRUD
  // =====================================================

  async createProduct(merchantId: string, dto: CreateProductDto) {
    const { images, categoryIds, ...productData } = dto;
    const { salePrice, mrp, deliveryFee } = this.normalizeProductPricing(dto);
    const inventory = this.normalizeInventoryValues(dto);

    if (categoryIds && categoryIds.length > 0) {
      await this.validateCategoryIds(categoryIds);
    }

    const productCreateData: any = {
      name: productData.name,
      description: productData.description,
      price: salePrice,
      salePrice,
      mrp,
      deliveryFee,
      currency: productData.currency,
      quantity: inventory.quantity,
      lowStockThreshold: inventory.lowStockThreshold,
      merchantId,
    };

    if (categoryIds) {
      productCreateData.categories = {
        connect: categoryIds.map((id) => ({ id })),
      };
    }

    // Add images if provided
    if (images && images.length > 0) {
      productCreateData.images = {
        create: images.map((img, index) => ({
          url: img.url,
          type: img.type || 'IMAGE',
          isPrimary: img.isPrimary ?? index === 0,
          sortOrder:
            typeof img.sortOrder === 'number'
              ? img.sortOrder
              : parseInt(String(img.sortOrder ?? index), 10),
        })),
      };
    }

    const product = await this.prisma.product.create({
      data: productCreateData,
      include: {
        images: true,
        categories: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    return this.mapProductResponse(product);
  }

  async getProducts(merchantId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { merchantId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          images: {
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          },
          categories: {
            where: { isActive: true },
            orderBy: { name: 'asc' },
          },
        },
      }),
      this.prisma.product.count({
        where: { merchantId },
      }),
    ]);

    return {
      total,
      page,
      limit,
      data: products.map((p) => this.mapProductResponse(p)),
    };
  }

  async getLowStockProductAlerts(merchantId: string) {
    return this.getLowStockAlerts(merchantId);
  }

  async listProductCategories() {
    return this.prisma.productCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async updateProduct(
    merchantId: string,
    productId: string,
    dto: CreateProductDto,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.merchantId !== merchantId) {
      throw new ForbiddenException('Access denied');
    }

    const { images, categoryIds, ...productData } = dto;
    const { salePrice, mrp, deliveryFee } = this.normalizeProductPricing(dto);
    const quantity =
      typeof dto.quantity === 'number'
        ? Math.max(0, Math.trunc(dto.quantity))
        : product.quantity;
    const lowStockThreshold =
      typeof dto.lowStockThreshold === 'number'
        ? Math.max(0, Math.trunc(dto.lowStockThreshold))
        : product.lowStockThreshold;

    if (categoryIds) {
      await this.validateCategoryIds(categoryIds);
    }

    // Update product basic info
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        name: productData.name,
        description: productData.description,
        price: salePrice,
        salePrice,
        mrp,
        deliveryFee,
        currency: productData.currency,
        quantity,
        lowStockThreshold,
        ...(categoryIds
          ? {
              categories: {
                set: categoryIds.map((id) => ({ id })),
              },
            }
          : {}),
      },
    });

    // If images are provided in update, replace them
    if (images && images.length > 0) {
      // Delete existing images
      await this.prisma.productImage.deleteMany({
        where: { productId },
      });

      // Create new images
      await this.prisma.productImage.createMany({
        data: images.map((img, index) => ({
          productId,
          url: img.url,
          type: img.type || 'IMAGE',
          isPrimary: img.isPrimary ?? index === 0,
          sortOrder: parseInt(String(img.sortOrder || index), 10),
        })),
      });
    }

    return this.getProductWithImages(productId);
  }

  async updateProductInventory(
    merchantId: string,
    productId: string,
    dto: UpdateProductInventoryDto,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.merchantId !== merchantId) {
      throw new ForbiddenException('Access denied');
    }

    const quantity = Math.max(0, Math.trunc(dto.quantity));
    const lowStockThreshold =
      typeof dto.lowStockThreshold === 'number'
        ? Math.max(0, Math.trunc(dto.lowStockThreshold))
        : product.lowStockThreshold;

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        quantity,
        lowStockThreshold,
      },
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        categories: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    return {
      product: this.mapProductResponse(updated),
      notification:
        updated.quantity <= updated.lowStockThreshold
          ? {
              level: updated.quantity <= 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
              message:
                updated.quantity <= 0
                  ? `${updated.name} is out of stock`
                  : `${updated.name} is low on stock (${updated.quantity} left)`,
            }
          : null,
    };
  }

  async deleteProduct(merchantId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.merchantId !== merchantId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.product.delete({
      where: { id: productId },
    });

    return { message: 'Product deleted successfully' };
  }

  // =====================================================
  // PRODUCT IMAGE MANAGEMENT
  // =====================================================

  async addProductImages(
    merchantId: string,
    productId: string,
    images: ProductImageDto[],
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.merchantId !== merchantId) {
      throw new ForbiddenException('Access denied');
    }

    if (!images.length) {
      throw new BadRequestException('At least one image is required');
    }

    const hasPrimaryInPayload = images.some((img) => img.isPrimary === true);
    if (hasPrimaryInPayload) {
      await this.prisma.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const hasExistingPrimary = hasPrimaryInPayload
      ? false
      : (await this.prisma.productImage.count({
          where: { productId, isPrimary: true },
        })) > 0;
    const shouldAutoAssignPrimary = !hasPrimaryInPayload && !hasExistingPrimary;

    let primaryAssigned = false;
    await this.prisma.productImage.createMany({
      data: images.map((img, index) => {
        let isPrimary = false;
        if (shouldAutoAssignPrimary) {
          isPrimary = index === 0;
        } else if (img.isPrimary === true && !primaryAssigned) {
          isPrimary = true;
          primaryAssigned = true;
        }

        return {
          productId,
          url: img.url,
          type: (img.type as ProductImageType) || ProductImageType.IMAGE,
          isPrimary,
          sortOrder:
            typeof img.sortOrder === 'number'
              ? Math.max(0, Math.trunc(img.sortOrder))
              : index,
        };
      }),
    });

    return this.getProductWithImages(productId);
  }

  async updateProductImages(
    merchantId: string,
    productId: string,
    images: ProductImageDto[],
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.merchantId !== merchantId) {
      throw new ForbiddenException('Access denied');
    }

    // Delete existing images
    await this.prisma.productImage.deleteMany({
      where: { productId },
    });

    if (!images.length) {
      return this.getProductWithImages(productId);
    }

    const hasPrimaryInPayload = images.some((img) => img.isPrimary === true);
    const shouldAutoAssignPrimary = !hasPrimaryInPayload;
    let primaryAssigned = false;

    await this.prisma.productImage.createMany({
      data: images.map((img, index) => {
        let isPrimary = false;
        if (shouldAutoAssignPrimary) {
          isPrimary = index === 0;
        } else if (img.isPrimary === true && !primaryAssigned) {
          isPrimary = true;
          primaryAssigned = true;
        }

        return {
          productId,
          url: img.url,
          type: (img.type as ProductImageType) || ProductImageType.IMAGE,
          isPrimary,
          sortOrder:
            typeof img.sortOrder === 'number'
              ? Math.max(0, Math.trunc(img.sortOrder))
              : index,
        };
      }),
    });

    return this.getProductWithImages(productId);
  }

  async deleteProductImage(
    merchantId: string,
    productId: string,
    imageId: string,
  ) {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    if (image.productId !== productId) {
      throw new NotFoundException('Image not found for this product');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        merchantId,
      },
      select: { id: true },
    });

    if (!product) {
      throw new ForbiddenException('Access denied');
    }

    const wasPrimary = image.isPrimary;

    await this.prisma.productImage.delete({
      where: { id: imageId },
    });

    // If deleted image was primary, set another image as primary
    if (wasPrimary) {
      const remainingImages = await this.prisma.productImage.findMany({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
        take: 1,
      });

      if (remainingImages.length > 0) {
        await this.prisma.productImage.update({
          where: { id: remainingImages[0].id },
          data: { isPrimary: true },
        });
      }
    }

    return { success: true, message: 'Image deleted successfully' };
  }

  private async getProductWithImages(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        categories: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      ...this.mapProductResponse(product),
    };
  }

  async listPayoutWallets(merchantId: string) {
    const wallets = await this.prisma.merchantPayoutWallet.findMany({
      where: { merchantId },
      include: {
        network: {
          select: {
            id: true,
            name: true,
            chainId: true,
            isActive: true,
            code: true,
            symbol: true,
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

    return Promise.all(
      wallets.map(async (wallet) => {
        const balances = await this.getWalletAssetBalances(
          wallet.id,
          wallet.address,
          wallet.network,
        );
        const nativeBalance = balances.find((asset) => asset.isNative)
          ?.balanceEntry || {
          balance: '0',
          symbol: wallet.network.symbol || 'NATIVE',
        };

        return {
          id: wallet.id,
          networkId: wallet.networkId,
          address: wallet.address,
          label: wallet.label,
          isActive: wallet.isActive,
          network: {
            id: wallet.network.id,
            name: wallet.network.name,
            chainId: wallet.network.chainId.toString(),
            isActive: wallet.network.isActive,
            code: wallet.network.code,
            symbol: wallet.network.symbol,
          },
          balances: balances.map((asset) => asset.balanceEntry),
          nativeBalance,
          createdAt: wallet.createdAt,
          updatedAt: wallet.updatedAt,
        };
      }),
    );
  }

  async upsertPayoutWallet(
    merchantId: string,
    networkId: string,
    dto: UpsertPayoutWalletDto,
  ) {
    const network = await this.prisma.blockchainNetwork.findFirst({
      where: {
        id: networkId,
        isActive: true,
      },
      select: { id: true, name: true, chainId: true, code: true, symbol: true },
    });

    if (!network) {
      throw new NotFoundException('Active network not found');
    }

    const normalizedAddress = this.normalizePayoutWalletAddress(
      dto.address,
      network.code,
    );

    const wallet = await this.prisma.merchantPayoutWallet.upsert({
      where: {
        merchantId_networkId: {
          merchantId,
          networkId,
        },
      },
      update: {
        address: normalizedAddress,
        label: dto.label?.trim() || null,
        isActive: true,
      },
      create: {
        merchantId,
        networkId,
        address: normalizedAddress,
        label: dto.label?.trim() || null,
        isActive: true,
      },
    });

    const activeTokenIds = await this.prisma.networkToken.findMany({
      where: {
        networkId,
        isActive: true,
      },
      select: { id: true },
    });

    for (const token of activeTokenIds) {
      await this.prisma.merchantPayoutWalletToken.upsert({
        where: {
          walletId_tokenId: {
            walletId: wallet.id,
            tokenId: token.id,
          },
        },
        update: {
          receiveAddress: wallet.address,
          isActive: true,
        },
        create: {
          walletId: wallet.id,
          tokenId: token.id,
          receiveAddress: wallet.address,
          isActive: true,
        },
      });
    }

    return {
      id: wallet.id,
      networkId: wallet.networkId,
      address: wallet.address,
      label: wallet.label,
      isActive: wallet.isActive,
      network: {
        ...network,
        chainId: network.chainId.toString(),
      },
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  async deactivatePayoutWallet(merchantId: string, networkId: string) {
    const existing = await this.prisma.merchantPayoutWallet.findUnique({
      where: {
        merchantId_networkId: {
          merchantId,
          networkId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Payout wallet not found for this network');
    }

    const wallet = await this.prisma.merchantPayoutWallet.update({
      where: {
        merchantId_networkId: {
          merchantId,
          networkId,
        },
      },
      data: { isActive: false },
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
    });

    return {
      id: wallet.id,
      networkId: wallet.networkId,
      address: wallet.address,
      label: wallet.label,
      isActive: wallet.isActive,
      network: {
        ...wallet.network,
        chainId: wallet.network.chainId.toString(),
      },
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  // =====================================================
  // HELPERS
  // =====================================================

  private decimalToString(value: Prisma.Decimal | null | undefined): string {
    return value ? value.toString() : '0';
  }

  private normalizePayoutWalletAddress(
    address: string,
    networkCode?: string | null,
  ): string {
    const normalized = String(address || '').trim();
    return this.isTronNetwork(networkCode)
      ? normalized
      : normalized.toLowerCase();
  }

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
        const balanceSun = await getTrxBalance(
          address,
          rpcUrl,
          normalizedCode || undefined,
        );
        return {
          balance: sunToTrx(balanceSun),
          symbol: 'TRX',
        };
      }

      const balanceWei = await executeWithRetry(
        `getBalance(${address})`,
        async () => {
          const provider = createJsonRpcProvider(rpcUrl);
          return provider.getBalance(address);
        },
        normalizedCode || undefined,
      );

      return {
        balance: formatEther(balanceWei),
        symbol,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get native balance for merchant payout address ${address}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        balance: '0',
        symbol,
      };
    }
  }

  private async getWalletAssetBalances(
    walletId: string,
    walletAddress: string,
    network: {
      id: string;
      code: string | null;
      symbol: string | null;
      rpcUrl: string;
    },
  ): Promise<
    Array<{
      isNative: boolean;
      balanceEntry: {
        tokenId: string | null;
        symbol: string;
        name: string;
        decimals: number;
        contractAddress: string | null;
        receiveAddress: string;
        isNative: boolean;
        balance: string;
      };
    }>
  > {
    await this.ensureDefaultNetworkTokens(network);

    const configuredTokens = await this.prisma.networkToken.findMany({
      where: {
        networkId: network.id,
        isActive: true,
      },
      orderBy: [{ isNative: 'desc' }, { symbol: 'asc' }],
    });
    const tokenAddressOverrides =
      await this.prisma.merchantPayoutWalletToken.findMany({
        where: {
          walletId,
          isActive: true,
        },
        select: {
          tokenId: true,
          receiveAddress: true,
        },
      });
    const tokenAddressMap = new Map(
      tokenAddressOverrides.map((entry) => [
        entry.tokenId,
        entry.receiveAddress,
      ]),
    );

    const defaultNative = this.defaultNativeAsset(network);
    const hasNativeToken = configuredTokens.some((token) => token.isNative);
    const tokens = hasNativeToken
      ? configuredTokens
      : [
          {
            id: null,
            networkId: network.id,
            symbol: defaultNative.symbol,
            name: defaultNative.name,
            decimals: defaultNative.decimals,
            contractAddress: null,
            isNative: true,
            isActive: true,
            createdAt: new Date(0),
            updatedAt: new Date(0),
          },
          ...configuredTokens,
        ];

    return Promise.all(
      tokens.map(async (token) => {
        const mappedAddress =
          (token.id ? tokenAddressMap.get(token.id) : null) || walletAddress;
        const receiveAddress = this.normalizePayoutWalletAddress(
          String(mappedAddress || ''),
          network.code,
        );

        if (token.isNative) {
          const nativeBalance = await this.getNativeBalance(
            receiveAddress,
            network.code,
            network.rpcUrl,
            network.symbol,
          );

          return {
            isNative: true,
            balanceEntry: {
              tokenId: token.id,
              symbol: token.symbol,
              name: token.name,
              decimals: token.decimals,
              contractAddress: null,
              receiveAddress,
              isNative: true,
              balance: nativeBalance.balance,
            },
          };
        }

        if (!token.contractAddress) {
          return {
            isNative: false,
            balanceEntry: {
              tokenId: token.id,
              symbol: token.symbol,
              name: token.name,
              decimals: token.decimals,
              contractAddress: null,
              receiveAddress,
              isNative: false,
              balance: '0',
            },
          };
        }

        try {
          const rawBalance = await getTokenBalanceRaw({
            walletAddress: receiveAddress,
            tokenAddress: token.contractAddress,
            rpcUrl: network.rpcUrl,
            networkCode: network.code,
          });

          return {
            isNative: false,
            balanceEntry: {
              tokenId: token.id,
              symbol: token.symbol,
              name: token.name,
              decimals: token.decimals,
              contractAddress: token.contractAddress,
              receiveAddress,
              isNative: false,
              balance: formatRawTokenAmount(rawBalance, token.decimals),
            },
          };
        } catch (error) {
          this.logger.error(
            `Failed to get token balance token=${token.symbol} address=${receiveAddress}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );

          return {
            isNative: false,
            balanceEntry: {
              tokenId: token.id,
              symbol: token.symbol,
              name: token.name,
              decimals: token.decimals,
              contractAddress: token.contractAddress,
              receiveAddress,
              isNative: false,
              balance: '0',
            },
          };
        }
      }),
    );
  }

  private defaultNativeAsset(network: {
    code: string | null;
    symbol: string | null;
  }): {
    symbol: string;
    name: string;
    decimals: number;
  } {
    const symbol = network.symbol?.trim().toUpperCase() || 'NATIVE';
    return {
      symbol,
      name: `${symbol} Native`,
      decimals: this.isTronNetwork(network.code) ? 6 : 18,
    };
  }

  private async ensureDefaultNetworkTokens(network: {
    id: string;
    code: string | null;
    symbol: string | null;
  }) {
    const normalizedCode = network.code?.trim().toUpperCase() || '';
    const native = this.defaultNativeAsset(network);

    await this.prisma.networkToken.upsert({
      where: {
        networkId_symbol: {
          networkId: network.id,
          symbol: native.symbol,
        },
      },
      update: {
        name: native.name,
        decimals: native.decimals,
        contractAddress: null,
        isNative: true,
        isActive: true,
      },
      create: {
        networkId: network.id,
        symbol: native.symbol,
        name: native.name,
        decimals: native.decimals,
        contractAddress: null,
        isNative: true,
        isActive: true,
      },
    });
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
