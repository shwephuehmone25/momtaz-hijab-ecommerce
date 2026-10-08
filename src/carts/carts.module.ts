import { Module } from '@nestjs/common';
import { AdminCartsController } from './admin-carts.controller';
import { CartsService } from './carts.service';
import { CustomerCartController } from './customer-cart.controller';

@Module({
  controllers: [CustomerCartController, AdminCartsController],
  providers: [CartsService],
  exports: [CartsService],
})
export class CartsModule {}
