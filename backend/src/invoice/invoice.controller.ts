import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';

import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesDto } from './dto/list-invoices.dto';
import { InvoiceService } from './invoice.service';
import { MerchantJwtAuthGuard } from '../auth/guards/merchant-jwt-auth.guard';

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  // =====================================================
  // JWT PROTECTED ROUTES
  // =====================================================

  @UseGuards(MerchantJwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post()
  createInvoice(@Req() req: any, @Body() body: CreateInvoiceDto) {
    return this.invoiceService.createInvoice(req.user.sub, body);
  }

  @UseGuards(MerchantJwtAuthGuard)
  @Get()
  listInvoices(@Req() req: any, @Query() query: ListInvoicesDto) {
    return this.invoiceService.listMerchantInvoices(req.user.sub, query);
  }

  @UseGuards(MerchantJwtAuthGuard)
  @Get(':id')
  getInvoice(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.invoiceService.getInvoiceById(req.user.sub, id);
  }
}
