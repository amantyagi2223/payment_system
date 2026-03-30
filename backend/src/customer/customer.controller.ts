import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Patch,
  Delete,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';
import { CustomerAuthGuard } from '../auth/guards/customer-auth.guard';

@Controller('customer')
export class CustomerController {
  constructor(private readonly service: CustomerService) {}

  @Post('register')
  register(@Body() dto: RegisterCustomerDto) {
    return this.service.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginCustomerDto) {
    return this.service.login(dto);
  }

  @UseGuards(CustomerAuthGuard)
  @Get('me')
  getProfile(@Req() req: any) {
    return this.service.getProfile(req.user.customerId);
  }

  @UseGuards(CustomerAuthGuard)
  @Post('addresses')
  createAddress(@Req() req: any, @Body() dto: CreateCustomerAddressDto) {
    return this.service.createAddress(req.user.customerId, dto);
  }

  @UseGuards(CustomerAuthGuard)
  @Get('addresses')
  listAddresses(@Req() req: any) {
    return this.service.listAddresses(req.user.customerId);
  }

  @UseGuards(CustomerAuthGuard)
  @Get('product-categories-user')
  listProductCategories() {
    const dta = this.service.listProductCategories();
    console.log(dta);
    return dta;
  }

  @UseGuards(CustomerAuthGuard)
  @Patch('addresses/:addressId/default')
  setDefaultAddress(
    @Req() req: any,
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ) {
    return this.service.setDefaultAddress(req.user.customerId, addressId);
  }

  @UseGuards(CustomerAuthGuard)
  @Patch('addresses/:addressId')
  updateAddress(
    @Req() req: any,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Body() dto: Partial<CreateCustomerAddressDto>,
  ) {
    return this.service.updateAddress(req.user.customerId, addressId, dto);
  }

  @UseGuards(CustomerAuthGuard)
  @Delete('addresses/:addressId')
  deleteAddress(
    @Req() req: any,
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ) {
    return this.service.deleteAddress(req.user.customerId, addressId);
  }
}
