import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(?!0+(\.0+)?$)\d+(\.\d{1,8})?$/, {
    message: 'amount must be a positive decimal with up to 8 places',
  })
  amount: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value).trim().toUpperCase())
  currency: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value).trim().toUpperCase())
  @Matches(/^[A-Z0-9_]{2,40}$/, {
    message: 'network must be a valid uppercase chain code',
  })
  network: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(43200)
  expiresInMinutes?: number;
}
