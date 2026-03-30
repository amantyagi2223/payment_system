import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  UseGuards,
  Req,
  Query,
  Param,
  ParseUUIDPipe,
  ParseArrayPipe,
} from '@nestjs/common';

import { MerchantService } from './merchant.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { LoginMerchantDto } from './dto/login-merchant.dto';
import { CreateProductDto, ProductImageDto } from './dto/create-product.dto';
import { UpdateProductInventoryDto } from './dto/update-product-inventory.dto';
import { UpsertPayoutWalletDto } from './dto/upsert-payout-wallet.dto';
import { MerchantJwtAuthGuard } from '../auth/guards/merchant-jwt-auth.guard';

@Controller('merchant')
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  // =====================================================
  // PUBLIC ROUTES
  // =====================================================

  @Post('register')
  register(@Body() body: CreateMerchantDto) {
    return this.merchantService.register(body);
  }

  @Post('login')
  login(@Body() body: LoginMerchantDto) {
    return this.merchantService.login(body);
  }

  // =====================================================
  // PROTECTED ROUTES (JWT REQUIRED)
  // =====================================================

  @UseGuards(MerchantJwtAuthGuard)
  @Get('dashboard')
  getDashboard(@Req() req: any) {
    return this.merchantService.getDashboard(req.user.sub);
  }

  @UseGuards(MerchantJwtAuthGuard)
  @Get('product-categories')
  listProductCategories() {
    return this.merchantService.listProductCategories();
  }

  // ===============================
  // PRODUCT CRUD
  // ===============================

  @UseGuards(MerchantJwtAuthGuard)
  @Post('products')
  createProduct(@Req() req: any, @Body() dto: CreateProductDto) {
    return this.merchantService.createProduct(req.user.sub, dto);
  }

  @UseGuards(MerchantJwtAuthGuard)
  @Get('products')
  getProducts(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.merchantService.getProducts(
      req.user.sub,
      Number(page) || 1,
      Number(limit) || 10,
    );
  }

  @UseGuards(MerchantJwtAuthGuard)
  @Get('products/low-stock-alerts')
  getLowStockAlerts(@Req() req: any) {
    return this.merchantService.getLowStockProductAlerts(req.user.sub);
  }

  @UseGuards(MerchantJwtAuthGuard)
  @Put('products/:id')
  updateProduct(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.merchantService.updateProduct(req.user.sub, id, dto);
  }

  @UseGuards(MerchantJwtAuthGuard)
  @Put('products/:id/inventory')
  updateProductInventory(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductInventoryDto,
  ) {
    return this.merchantService.updateProductInventory(req.user.sub, id, dto);
  }

  // Alias endpoint for dashboard "Manage Stock" button
  @UseGuards(MerchantJwtAuthGuard)
  @Patch('products/:id/manage-stock')
  manageProductStock(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductInventoryDto,
  ) {
    return this.merchantService.updateProductInventory(req.user.sub, id, dto);
  }

  @UseGuards(MerchantJwtAuthGuard)
  @Delete('products/:id')
  deleteProduct(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.merchantService.deleteProduct(req.user.sub, id);
  }

  // ===============================
  // PRODUCT IMAGE MANAGEMENT
  // ===============================

  @UseGuards(MerchantJwtAuthGuard)
  @Post('products/:id/images')
  addProductImages(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(
      new ParseArrayPipe({
        items: ProductImageDto,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    images: ProductImageDto[],
  ) {
    return this.merchantService.addProductImages(req.user.sub, id, images);
  }

  @UseGuards(MerchantJwtAuthGuard)
  @Put('products/:id/images')
  updateProductImages(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(
      new ParseArrayPipe({
        items: ProductImageDto,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    images: ProductImageDto[],
  ) {
    return this.merchantService.updateProductImages(req.user.sub, id, images);
  }

  @UseGuards(MerchantJwtAuthGuard)
  @Delete('products/:id/images/:imageId')
  deleteProductImage(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.merchantService.deleteProductImage(req.user.sub, id, imageId);
  }

  @UseGuards(MerchantJwtAuthGuard)
  @Get('payout-wallets')
  listPayoutWallets(@Req() req: any) {
    return this.merchantService.listPayoutWallets(req.user.sub);
  }

  @UseGuards(MerchantJwtAuthGuard)
  @Get('wallets')
  listPayoutWalletsAlias(@Req() req: any) {
    return this.merchantService.listPayoutWallets(req.user.sub);
  }

  @UseGuards(MerchantJwtAuthGuard)
  @Get('wallets/details')
  listPayoutWalletDetails(@Req() req: any) {
    return this.merchantService.listPayoutWallets(req.user.sub);
  }

  @UseGuards(MerchantJwtAuthGuard)
  @Put('payout-wallets/:networkId')
  upsertPayoutWallet(
    @Req() req: any,
    @Param('networkId', ParseUUIDPipe) networkId: string,
    @Body() dto: UpsertPayoutWalletDto,
  ) {
    return this.merchantService.upsertPayoutWallet(
      req.user.sub,
      networkId,
      dto,
    );
  }

  @UseGuards(MerchantJwtAuthGuard)
  @Put('wallets/:networkId')
  upsertPayoutWalletAlias(
    @Req() req: any,
    @Param('networkId', ParseUUIDPipe) networkId: string,
    @Body() dto: UpsertPayoutWalletDto,
  ) {
    return this.merchantService.upsertPayoutWallet(
      req.user.sub,
      networkId,
      dto,
    );
  }

  @UseGuards(MerchantJwtAuthGuard)
  @Delete('payout-wallets/:networkId')
  deactivatePayoutWallet(
    @Req() req: any,
    @Param('networkId', ParseUUIDPipe) networkId: string,
  ) {
    return this.merchantService.deactivatePayoutWallet(req.user.sub, networkId);
  }

  @UseGuards(MerchantJwtAuthGuard)
  @Delete('wallets/:networkId')
  deactivatePayoutWalletAlias(
    @Req() req: any,
    @Param('networkId', ParseUUIDPipe) networkId: string,
  ) {
    return this.merchantService.deactivatePayoutWallet(req.user.sub, networkId);
  }
}
