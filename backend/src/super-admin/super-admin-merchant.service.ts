import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AdminMerchantListDto } from './dto/admin-merchant-list.dto';
import { AdminUpdateMerchantDto } from './dto/admin-update-merchant.dto';

@Injectable()
export class SuperAdminMerchantService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminMerchantListDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.MerchantWhereInput = {
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...(query.isActive !== undefined && {
        isActive: query.isActive === 'true',
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.merchant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.merchant.count({ where }),
    ]);

    return {
      total,
      page,
      limit,
      data,
    };
  }

  async getById(id: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return merchant;
  }

  async update(id: string, dto: AdminUpdateMerchantDto) {
    await this.getById(id);

    return this.prisma.merchant.update({
      where: { id },
      data: dto,
    });
  }

  async suspend(id: string) {
    await this.getById(id);

    return this.prisma.merchant.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activate(id: string) {
    await this.getById(id);

    return this.prisma.merchant.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async softDelete(id: string) {
    await this.getById(id);

    return this.prisma.merchant.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
