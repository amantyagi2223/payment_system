import { IsEmail, MinLength } from 'class-validator';

export class LoginCustomerDto {
  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;
}
