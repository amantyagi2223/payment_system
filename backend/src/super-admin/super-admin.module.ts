import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminGuard } from './super-admin.guard';
import { SuperAdminMerchantService } from './super-admin-merchant.service';
import { SuperAdminMerchantController } from './super-admin-merchant.controller';
import { OrdersModule } from '../orders/orders.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { CustomerChatModule } from '../customer-chat/customer-chat.module';

@Module({
  imports: [
    PrismaModule,
    OrdersModule,
    BlockchainModule,
    CustomerChatModule,
    JwtModule.register({
      secret: process.env.ADMIN_JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [SuperAdminController, SuperAdminMerchantController],
  providers: [SuperAdminService, SuperAdminMerchantService, SuperAdminGuard],
})
export class SuperAdminModule {}
