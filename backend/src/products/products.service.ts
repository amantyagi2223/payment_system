import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ProductImageInput {
  url: string;
  type: 'IMAGE' | 'VIDEO';
  isPrimary?: boolean;
  sortOrder?: number;
}

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories() {
    return this.prisma.productCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAll() {
    const products = await this.prisma.product.findMany({
      where: {
        quantity: { gt: 0 },
      },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
          },
        },
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        categories: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    return products.map((product) => ({
      ...product,
      price: product.price.toString(),
      salePrice: product.salePrice.toString(),
      mrp: product.mrp.toString(),
      deliveryFee: product.deliveryFee.toString(),
    }));
  }

  async searchProducts(query: string) {
    const searchTerm = query.trim();

    if (!searchTerm) {
      return this.findAll();
    }

    const products = await this.prisma.product.findMany({
      where: {
        AND: [
          { quantity: { gt: 0 } },
          {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } },
              {
                merchant: {
                  name: { contains: searchTerm, mode: 'insensitive' },
                },
              },
            ],
          },
        ],
      },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
          },
        },
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        categories: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    return products.map((product) => ({
      ...product,
      price: product.price.toString(),
      salePrice: product.salePrice.toString(),
      mrp: product.mrp.toString(),
      deliveryFee: product.deliveryFee.toString(),
    }));
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        quantity: { gt: 0 },
      },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
          },
        },
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
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return {
      ...product,
      price: product.price.toString(),
      salePrice: product.salePrice.toString(),
      mrp: product.mrp.toString(),
      deliveryFee: product.deliveryFee.toString(),
    };
  }

  async addProductImages(productId: string, images: ProductImageInput[]) {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // If any image is marked as primary, unset other primary images
    const hasPrimaryImage = images.some((img) => img.isPrimary);
    if (hasPrimaryImage) {
      await this.prisma.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Create new images
    await this.prisma.productImage.createMany({
      data: images.map((img) => ({
        productId,
        url: img.url,
        type: img.type || 'IMAGE',
        isPrimary: img.isPrimary || false,
        sortOrder: img.sortOrder || 0,
      })),
    });

    return this.findOne(productId);
  }

  async updateProductImages(productId: string, images: ProductImageInput[]) {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Delete existing images
    await this.prisma.productImage.deleteMany({
      where: { productId },
    });

    // If any image is marked as primary, handle it
    const hasPrimaryImage = images.some((img) => img.isPrimary);
    if (!hasPrimaryImage && images.length > 0) {
      // Mark first image as primary if none specified
      images[0].isPrimary = true;
    }

    // Create new images
    await this.prisma.productImage.createMany({
      data: images.map((img) => ({
        productId,
        url: img.url,
        type: img.type || 'IMAGE',
        isPrimary: img.isPrimary || false,
        sortOrder: img.sortOrder || 0,
      })),
    });

    return this.findOne(productId);
  }

  async deleteProductImage(imageId: string) {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      throw new NotFoundException(`Image with ID ${imageId} not found`);
    }

    const wasPrimary = image.isPrimary;
    const productId = image.productId;

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
}
