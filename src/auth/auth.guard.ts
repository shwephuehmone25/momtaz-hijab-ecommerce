import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
export type AuthRequest = Request & {
  auth: Awaited<ReturnType<AuthService['authenticate']>>;
};
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const header = request.headers.authorization ?? '';
    request.auth = await this.auth.authenticate(
      header.startsWith('Bearer ') ? header.slice(7) : '',
    );
    return true;
  }
}
@Injectable()
export class SuperAdminGuard extends AuthGuard {
  async canActivate(context: ExecutionContext) {
    await super.canActivate(context);
    if (
      !context
        .switchToHttp()
        .getRequest<AuthRequest>()
        .auth.user.roles.some((role) => role.name === 'SUPER_ADMIN')
    )
      throw new ForbiddenException('Super admin access required');
    return true;
  }
}
