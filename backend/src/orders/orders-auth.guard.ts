import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OrdersAuthGuard extends AuthGuard([
  'customer-jwt',
  'merchant-jwt',
]) {}
