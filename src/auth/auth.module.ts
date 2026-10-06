import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard, SuperAdminGuard } from './auth.guard';
@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, SuperAdminGuard],
  exports: [AuthService, AuthGuard, SuperAdminGuard],
})
export class AuthModule {}
