import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateBlockchainNetworkDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value).trim().toUpperCase())
  @Matches(/^[A-Z0-9_]{2,40}$/, {
    message:
      'code must be uppercase alphanumeric with optional underscores',
  })
  code: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value).trim())
  name: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value).trim())
  @Matches(/^\d+$/, { message: 'chainId must be a positive integer string' })
  chainId: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value).trim())
  @Matches(/^https?:\/\/\S+$/i, {
    message: 'rpcUrl must be a valid http(s) URL',
  })
  rpcUrl: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === null || value === undefined
      ? undefined
      : String(value).trim().toUpperCase(),
  )
  @Matches(/^[A-Z0-9]{2,10}$/, {
    message: 'symbol must be uppercase alphanumeric',
  })
  symbol?: string;
}
