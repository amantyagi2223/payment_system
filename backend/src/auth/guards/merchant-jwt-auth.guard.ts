import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class MerchantJwtAuthGuard extends AuthGuard('merchant-jwt') {}
