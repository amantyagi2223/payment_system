import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ProductService, ProductImageInput } from './products.service';

@Controller('products')
export class ProductController {
  constructor(private readonly service: ProductService) {}

  @Get('search')
  search(@Query('q') query = '') {
    return this.service.searchProducts(query);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('categories')
  listCategories() {
    return this.service.listCategories();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/images')
  addProductImages(
    @Param('id') productId: string,
    @Body() images: ProductImageInput[],
  ) {
    return this.service.addProductImages(productId, images);
  }

  @Put(':id/images')
  updateProductImages(
    @Param('id') productId: string,
    @Body() images: ProductImageInput[],
  ) {
    return this.service.updateProductImages(productId, images);
  }

  @Delete(':id/images/:imageId')
  deleteProductImage(@Param('imageId') imageId: string) {
    return this.service.deleteProductImage(imageId);
  }
}
