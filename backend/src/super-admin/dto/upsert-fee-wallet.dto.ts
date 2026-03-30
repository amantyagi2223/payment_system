import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class UpsertFeeWalletDto {
  @IsUUID()
  @IsNotEmpty()
  networkId: string;

  @IsOptional()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{64}$/, {
    message: 'privateKey must be a 0x-prefixed 64-hex private key',
  })
  privateKey?: string;
}
