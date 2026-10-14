import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LoginDto, RefreshDto } from './auth.dto';
import {
  AuthUserResponse,
  LoginResponse,
  TokenResponse,
} from './auth.responses';
import {
  CustomerAuthGuard,
  type CustomerAuthRequest,
} from './customer-auth.guard';
import { CustomerAuthService } from './customer-auth.service';

@ApiTags('Customer Authentication')
@ApiUnauthorizedResponse({
  description: 'Invalid credentials or expired session',
})
@Controller('api/v1/customers/auth')
export class CustomerAuthController {
  constructor(private readonly auth: CustomerAuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Customer login with email and password' })
  @ApiOkResponse({ type: LoginResponse })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOkResponse({ type: TokenResponse })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refresh_token);
  }

  @Get('me')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: AuthUserResponse })
  me(@Req() request: CustomerAuthRequest) {
    return request.customerAuth.customer;
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  logout(@Req() request: CustomerAuthRequest) {
    return this.auth.logout(request.customerAuth.sid);
  }
}
