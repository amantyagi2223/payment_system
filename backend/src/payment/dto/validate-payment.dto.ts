import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class ValidatePaymentDto {
  @Matches(
    /^(0x[a-fA-F0-9]{64}|[1-9A-HJ-NP-Za-km-z]{32,128}|[A-Za-z0-9]{32,128})$/,
    {
      message: 'txHash must be a valid chain transaction hash',
    },
  )
  txHash: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value).trim().toUpperCase())
  @Matches(/^[A-Z0-9_]{2,40}$/, {
    message: 'network must be a valid uppercase chain code',
  })
  network: string;

  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  requiredConfirmations?: number;
}
