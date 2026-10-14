import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import {
  AdminGuard,
  AuthGuard,
  OrderManagementGuard,
  SuperAdminGuard,
} from './auth.guard';
import { CustomerAuthController } from './customer-auth.controller';
import {
  CustomerAuthGuard,
  CustomerOwnershipGuard,
} from './customer-auth.guard';
import { CustomerAuthService } from './customer-auth.service';
@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, CustomerAuthController],
  providers: [
    AuthService,
    AuthGuard,
    AdminGuard,
    OrderManagementGuard,
    SuperAdminGuard,
    CustomerAuthService,
    CustomerAuthGuard,
    CustomerOwnershipGuard,
  ],
  exports: [
    AuthService,
    AuthGuard,
    AdminGuard,
    OrderManagementGuard,
    SuperAdminGuard,
    CustomerAuthService,
    CustomerAuthGuard,
    CustomerOwnershipGuard,
  ],
})
export class AuthModule {}
