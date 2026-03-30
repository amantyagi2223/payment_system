import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
// Helmet handled in main.ts
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MerchantModule } from './merchant/merchant.module';
import { InvoiceModule } from './invoice/invoice.module';
import { PaymentModule } from './payment/payment.module';
import { WebhookModule } from './webhook/webhook.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { PrismaModule } from './prisma/prisma.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { CustomerModule } from './customer/customer.module';
import { ProductModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { CustomerChatModule } from './customer-chat/customer-chat.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 20,
      },
    ]),
    AuthModule,
    MerchantModule,
    InvoiceModule,
    PaymentModule,
    WebhookModule,
    BlockchainModule,
    PrismaModule,
    SuperAdminModule,
    CustomerModule,
    CustomerChatModule,
    ProductModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
