import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateBlockchainNetworkDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => String(value).trim().toUpperCase())
  @Matches(/^[A-Z0-9_]{2,40}$/, {
    message:
      'code must be uppercase alphanumeric with optional underscores',
  })
  code?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => String(value).trim())
  name?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => String(value).trim())
  @Matches(/^\d+$/, { message: 'chainId must be a positive integer string' })
  chainId?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => String(value).trim())
  @Matches(/^https?:\/\/\S+$/i, {
    message: 'rpcUrl must be a valid http(s) URL',
  })
  rpcUrl?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => String(value).trim().toUpperCase())
  @Matches(/^[A-Z0-9]{2,10}$/, {
    message: 'symbol must be uppercase alphanumeric',
  })
  symbol?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
