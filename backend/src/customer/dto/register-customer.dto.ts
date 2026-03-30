import { IsEmail, MinLength, IsString } from 'class-validator';

export class RegisterCustomerDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;
}
