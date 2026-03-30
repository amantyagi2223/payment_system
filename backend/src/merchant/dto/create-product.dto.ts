import {
  IsString,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductImageType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

export class ProductImageDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsEnum(ProductImageType)
  @IsOptional()
  type?: ProductImageType;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumberString()
  @IsOptional()
  price?: string; // Backward-compatible alias for salePrice

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsNumberString()
  @IsOptional()
  mrp?: string;

  @IsNumberString()
  @IsOptional()
  salePrice?: string;

  @IsNumberString()
  @IsOptional()
  deliveryFee?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  categoryIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];
}
