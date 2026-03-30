import { IsOptional, IsNumberString, IsBooleanString } from 'class-validator';

export class AdminMerchantListDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  search?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;
}
