import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersAuthGuard } from './orders-auth.guard';

@Module({
  imports: [PrismaModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersAuthGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
