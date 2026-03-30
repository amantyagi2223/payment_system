import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { jwtConstants } from '../jwt.constants';

@Injectable()
export class MerchantJwtStrategy extends PassportStrategy(
  Strategy,
  'merchant-jwt',
) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtConstants.secret,
      ignoreExpiration: false,
    });
  }

  async validate(payload: { sub: string; role: string }) {
    if (payload.role !== 'MERCHANT') {
      throw new UnauthorizedException('Invalid token role');
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: payload.sub },
    });

    if (!merchant || !merchant.isActive) {
      throw new UnauthorizedException('Merchant not active');
    }

    return {
      sub: merchant.id,
      email: merchant.email,
      role: 'MERCHANT',
    };
  }
}
