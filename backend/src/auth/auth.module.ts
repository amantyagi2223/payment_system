// src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { jwtConstants } from './jwt.constants';
import { CustomerJwtStrategy } from './strategies/customer-jwt.strategy';
import { MerchantJwtStrategy } from './strategies/merchant-jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: {
        expiresIn: '1d',
      },
    }),
  ],
  providers: [CustomerJwtStrategy, MerchantJwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
