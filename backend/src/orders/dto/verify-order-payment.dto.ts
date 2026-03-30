import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class VerifyOrderPaymentDto {
  @IsOptional()
  @Matches(
    /^(0x[a-fA-F0-9]{64}|[1-9A-HJ-NP-Za-km-z]{32,128}|[A-Za-z0-9]{32,128})$/,
    {
      message: 'txHash must be a valid chain transaction hash',
    },
  )
  txHash?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  autoDetect?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  requiredConfirmations?: number;
}
