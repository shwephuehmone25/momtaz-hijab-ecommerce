import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard, type AuthRequest } from './auth.guard';
import { LoginDto, RefreshDto } from './auth.dto';
import { ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import {
  AuthUserResponse,
  LoginResponse,
  TokenResponse,
} from './auth.responses';
@ApiTags('Authentication')
@ApiUnauthorizedResponse({
  description: 'Invalid credentials or expired session',
})
@Controller('api/v1/admin/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('login')
  @ApiOkResponse({ type: LoginResponse })
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin login with email and password' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password);
  }
  @Post('refresh')
  @ApiOkResponse({ type: TokenResponse })
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refresh_token);
  }
  @Get('me')
  @ApiOkResponse({ type: AuthUserResponse })
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  me(@Req() request: AuthRequest) {
    return request.auth.user;
  }
  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  logout(@Req() request: AuthRequest) {
    return this.auth.logout(request.auth.sid);
  }
}
