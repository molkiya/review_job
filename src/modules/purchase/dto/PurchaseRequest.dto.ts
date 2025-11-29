import { IsUUID } from 'class-validator';

export class PurchaseRequestDto {
  @IsUUID('4', { message: 'userId must be a valid UUID' })
  userId!: string;

  @IsUUID('4', { message: 'productId must be a valid UUID' })
  productId!: string;
}
