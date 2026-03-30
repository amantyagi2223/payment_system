import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  Length,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateCustomerAddressDto {
  @IsNotEmpty({ message: 'name is required' })
  @IsString()
  @Length(1, 100)
  name: string;

  @IsNotEmpty({ message: 'street1 is required' })
  @IsString()
  @Length(1, 200)
  street1: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  street2?: string;

  @IsNotEmpty({ message: 'city is required' })
  @IsString()
  @Length(1, 100)
  city: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  state?: string;

  @IsNotEmpty({ message: 'zipCode is required' })
  @IsString()
  @Length(3, 20)
  zipCode: string;

  @IsNotEmpty({ message: 'country is required' })
  @IsString()
  @Length(2, 100)
  country: string;

  @IsOptional()
  @IsNumber({}, { message: 'lat must be a number' })
  @Min(-90, { message: 'lat must be between -90 and 90' })
  @Max(90, { message: 'lat must be between -90 and 90' })
  lat?: number;

  @IsOptional()
  @IsNumber({}, { message: 'lng must be a number' })
  @Min(-180, { message: 'lng must be between -180 and 180' })
  @Max(180, { message: 'lng must be between -180 and 180' })
  lng?: number;

  @IsOptional()
  @IsEnum(['HOME', 'WORK', 'OTHER'], {
    message: 'addressType must be HOME, WORK, or OTHER',
  })
  addressType?: 'HOME' | 'WORK' | 'OTHER';

  @IsOptional()
  isDefault?: boolean;
}
