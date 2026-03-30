import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class UpsertNetworkTokenDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value).trim().toUpperCase())
  @Matches(/^[A-Z0-9_]{2,20}$/, {
    message: 'symbol must be uppercase alphanumeric',
  })
  symbol: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value).trim())
  name: string;

  @IsInt()
  @Min(0)
  @Max(36)
  decimals: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === null || value === undefined ? value : String(value).trim(),
  )
  contractAddress?: string | null;

  @IsOptional()
  @IsBoolean()
  isNative?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
