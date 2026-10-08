import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomersModule } from './customers/customers.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AddressesModule } from './addresses/addresses.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { ProductVariantsModule } from './product-variants/product-variants.module';
import { InventoryModule } from './inventory/inventory.module';
import { CartsModule } from './carts/carts.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    CustomersModule,
    AddressesModule,
    CategoriesModule,
    ProductsModule,
    ProductVariantsModule,
    InventoryModule,
    CartsModule,
    DashboardModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
