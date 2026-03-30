import { IsNotEmpty, IsUUID, IsInt, Min } from 'class-validator';

export class OrderItemDto {
  @IsNotEmpty({ message: 'productId is required' })
  @IsUUID()
  productId: string;

  @IsInt({ message: 'quantity must be an integer' })
  @Min(1, { message: 'quantity must be at least 1' })
  quantity: number = 1;
}
