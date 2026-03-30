import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpsertPayoutWalletDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0x[a-fA-F0-9]{40}|T[a-zA-Z0-9]{33})$/, {
    message:
      'address must be a valid Ethereum (0x...) or TRON (T...) wallet address',
  })
  address: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;
}
