import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';

import { PaymentService } from './payment.service';
import { ValidatePaymentDto } from './dto/validate-payment.dto';
import { MerchantJwtAuthGuard } from '../auth/guards/merchant-jwt-auth.guard';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // =====================================================
  // JWT PROTECTED ROUTES
  // =====================================================

  @UseGuards(MerchantJwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @Post('validate')
  validatePayment(@Req() req: any, @Body() body: ValidatePaymentDto) {
    return this.paymentService.validatePayment(req.user.sub, body);
  }

  @UseGuards(MerchantJwtAuthGuard)
  @Get('invoice/:invoiceId')
  getPaymentsForInvoice(
    @Req() req: any,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
  ) {
    return this.paymentService.getPaymentsForInvoice(req.user.sub, invoiceId);
  }
}
