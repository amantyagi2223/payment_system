import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyOrderPaymentDto } from './dto/verify-order-payment.dto';
import { OrdersAuthGuard } from './orders-auth.guard';

@Controller('orders')
@UseGuards(OrdersAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async listOrders(@Req() req: any) {
    const customerId = await this.ordersService.resolveCustomerIdFromAuthUser(
      req.user,
    );

    return this.ordersService.listOrdersForCustomer(customerId);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post()
  async createOrder(@Req() req: any, @Body() body: CreateOrderDto) {
    const customerId = await this.ordersService.resolveCustomerIdFromAuthUser(
      req.user,
    );

    return this.ordersService.createPendingOrder(customerId, body);
  }

  @Get(':orderId')
  async getOrder(
    @Req() req: any,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    const customerId = await this.ordersService.resolveCustomerIdFromAuthUser(
      req.user,
    );

    return this.ordersService.getOrderForCustomer(customerId, orderId);
  }

  @Post(':orderId/verify')
  async verifyOrderPayment(
    @Req() req: any,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() body: VerifyOrderPaymentDto,
  ) {
    const customerId = await this.ordersService.resolveCustomerIdFromAuthUser(
      req.user,
    );

    return this.ordersService.verifyPaymentForCustomer(
      customerId,
      orderId,
      body,
    );
  }

  @Post(':orderId/settle')
  async settleOrderToMerchant(
    @Req() req: any,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    if (req.user?.role !== 'MERCHANT') {
      throw new ForbiddenException('Merchant token required');
    }

    return this.ordersService.settlePaidOrderForMerchant(req.user.sub, orderId);
  }
}
