import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JsonWebTokenError, JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { TokenType, type JwtPayload } from '@lib/utils';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.getPublicKey(),
        algorithms: ['ES256'],
      });
      if (payload.type !== TokenType.ACCESS) {
        throw new UnauthorizedException('Access token required');
      }
      request.user = payload;
      return true;
    } catch (error) {
      if (isPublic) return true;
      if (error instanceof HttpException) throw error;
      if (
        error instanceof JsonWebTokenError &&
        error.name === 'TokenExpiredError'
      ) {
        throw new UnauthorizedException('The token has expired');
      }
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private extractBearerToken(request: Request): string | undefined {
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    return scheme?.toLowerCase() === 'bearer' ? token : undefined;
  }

  private getPublicKey(): string {
    const key = this.configService.get<string>('JWT_PUBLIC_KEY');
    if (!key) {
      throw new UnauthorizedException('JWT public key is not configured');
    }
    return key.replace(/\\n/g, '\n');
  }
}
