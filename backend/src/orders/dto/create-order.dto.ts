import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderItemDto } from './order-item.dto';

export class CreateOrderDto {
  @IsNotEmpty({ message: 'items are required' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsUUID()
  blockchainId?: string;

  @IsOptional()
  @IsUUID()
  deliveryAddressId?: string;

  @IsOptional()
  @IsString()
  @Length(2, 20)
  paymentSymbol?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0)
  deliveryFeeUsd?: number;

  @IsOptional()
  @IsString()
  @Length(32, 128)
  idempotencyKey?: string;
}
