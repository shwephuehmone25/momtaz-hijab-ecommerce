import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { CustomerAuthService } from './customer-auth.service';

export type CustomerAuthRequest = Request & {
  customerAuth: Awaited<ReturnType<CustomerAuthService['authenticate']>>;
};

@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(private readonly auth: CustomerAuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<CustomerAuthRequest>();
    const header = request.headers.authorization ?? '';
    request.customerAuth = await this.auth.authenticate(
      header.startsWith('Bearer ') ? header.slice(7) : '',
    );
    return true;
  }
}

@Injectable()
export class CustomerOwnershipGuard extends CustomerAuthGuard {
  async canActivate(context: ExecutionContext) {
    await super.canActivate(context);
    const request = context.switchToHttp().getRequest<CustomerAuthRequest>();
    const requestedCustomerId = Number(request.params.customerId);
    if (request.customerAuth.customer.id !== requestedCustomerId) {
      throw new ForbiddenException('You may only access your own cart');
    }
    return true;
  }
}
