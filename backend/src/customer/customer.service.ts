import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterCustomerDto) {
    const email = dto.email.toLowerCase();

    const existing = await this.prisma.customer.findUnique({
      where: { email },
    });

    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const customer = await this.prisma.customer.create({
      data: {
        name: dto.name,
        email,
        password: hashedPassword,
      },
    });

    return this.generateToken(customer.id, customer.email);
  }

  async login(dto: LoginCustomerDto) {
    const email = dto.email.toLowerCase();

    const customer = await this.prisma.customer.findUnique({
      where: { email },
    });

    if (!customer) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(dto.password, customer.password);

    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!customer.isActive) {
      throw new ForbiddenException('Account disabled');
    }

    return this.generateToken(customer.id, customer.email);
  }

  async getProfile(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!customer) {
      throw new UnauthorizedException();
    }

    const addresses = await this.listAddresses(customerId);

    return {
      ...customer,
      addresses,
    };
  }

  async createAddress(customerId: string, dto: CreateCustomerAddressDto) {
    const isDefault = dto.isDefault ?? false;

    // Unset other defaults if this is default
    if (isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: {
          customerId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const payload = {
      customerId,
      name: dto.name,
      street1: dto.street1,
      street2: dto.street2,
      city: dto.city,
      state: dto.state,
      zipCode: dto.zipCode,
      country: dto.country,
      lat: dto.lat,
      lng: dto.lng,
      addressType: dto.addressType || 'HOME',
      isDefault,
      isActive: true,
    };

    try {
      return await this.prisma.customerAddress.create({
        data: payload,
      });
    } catch (error) {
      if (!this.isAddressUniqueConstraintError(error)) {
        throw error;
      }

      // If a soft-deleted row conflicts on (customerId, name, isDefault),
      // reactivate and update it instead of returning a 500.
      const conflicting = await this.prisma.customerAddress.findFirst({
        where: {
          customerId,
          name: dto.name,
          isDefault,
        },
      });

      if (conflicting && !conflicting.isActive) {
        const reactivatePayload = {
          name: payload.name,
          street1: payload.street1,
          street2: payload.street2,
          city: payload.city,
          state: payload.state,
          zipCode: payload.zipCode,
          country: payload.country,
          lat: payload.lat,
          lng: payload.lng,
          addressType: payload.addressType,
          isDefault: payload.isDefault,
          isActive: payload.isActive,
        };
        return this.prisma.customerAddress.update({
          where: { id: conflicting.id },
          data: reactivatePayload,
        });
      }

      throw new BadRequestException(
        'Address with this name already exists. Please use a different address name.',
      );
    }
  }

  async listAddresses(customerId: string) {
    return this.prisma.customerAddress.findMany({
      where: {
        customerId,
        isActive: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async listProductCategories() {
    return this.prisma.productCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async setDefaultAddress(customerId: string, addressId: string) {
    // Unset all defaults
    await this.prisma.customerAddress.updateMany({
      where: {
        customerId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    // Set new default
    const address = await this.prisma.customerAddress.update({
      where: {
        id: addressId,
      },
      data: {
        isDefault: true,
      },
    });

    return address;
  }

  async updateAddress(
    customerId: string,
    addressId: string,
    dto: Partial<CreateCustomerAddressDto>,
  ) {
    // Handle default logic
    if (dto.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: {
          customerId,
          NOT: { id: addressId },
        },
        data: { isDefault: false },
      });
    }

    const updateData: Prisma.CustomerAddressUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.street1 !== undefined ? { street1: dto.street1 } : {}),
      ...(dto.street2 !== undefined ? { street2: dto.street2 } : {}),
      ...(dto.city !== undefined ? { city: dto.city } : {}),
      ...(dto.state !== undefined ? { state: dto.state } : {}),
      ...(dto.zipCode !== undefined ? { zipCode: dto.zipCode } : {}),
      ...(dto.country !== undefined ? { country: dto.country } : {}),
      ...(dto.lat !== undefined ? { lat: dto.lat } : {}),
      ...(dto.lng !== undefined ? { lng: dto.lng } : {}),
      ...(dto.addressType !== undefined
        ? { addressType: dto.addressType }
        : {}),
      ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
    };

    try {
      return await this.prisma.customerAddress.update({
        where: {
          id: addressId,
        },
        data: updateData,
      });
    } catch (error) {
      if (this.isAddressUniqueConstraintError(error)) {
        throw new BadRequestException(
          'Address with this name already exists. Please use a different address name.',
        );
      }
      throw error;
    }
  }

  async deleteAddress(customerId: string, addressId: string) {
    // Can't delete if it's the only default address
    const hasOtherDefaults = await this.prisma.customerAddress.count({
      where: {
        customerId,
        id: { not: addressId },
        isDefault: true,
      },
    });

    const address = await this.prisma.customerAddress.findUnique({
      where: {
        id: addressId,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (address.isDefault && !hasOtherDefaults) {
      throw new BadRequestException('Cannot delete the only default address');
    }

    await this.prisma.customerAddress.update({
      where: {
        id: addressId,
      },
      data: {
        isActive: false,
      },
    });

    return { success: true, message: 'Address soft-deleted successfully' };
  }

  private generateToken(id: string, email: string) {
    return {
      accessToken: this.jwtService.sign({ sub: id }),
      user: {
        id,
        email,
      },
    };
  }

  private isAddressUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
