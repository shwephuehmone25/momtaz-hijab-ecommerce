import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { TokenType, type JwtPayload } from '@lib/utils';
import { RefreshTokenDto } from '../dto/refresh-token.dto';

type RefreshRequest = Request & { user?: JwtPayload };

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RefreshRequest>();
    const token = (request.body as RefreshTokenDto | undefined)?.refreshToken;
    if (!token) throw new UnauthorizedException('Refresh token required');

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.getPublicKey(),
        algorithms: ['ES256'],
      });
      if (payload.type !== TokenType.REFRESH) {
        throw new UnauthorizedException('Refresh token required');
      }
      request.user = payload;
      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private getPublicKey(): string {
    const key = this.configService.get<string>('JWT_PUBLIC_KEY');
    if (!key) {
      throw new UnauthorizedException('JWT public key is not configured');
    }
    return key.replace(/\\n/g, '\n');
  }
}
