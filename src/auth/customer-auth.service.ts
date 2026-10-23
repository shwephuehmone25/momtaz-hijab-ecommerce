import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { varchar } from '../common/database/varchar';
import { throwIfUniqueViolation } from '../common/database/database-error';
import { hashPassword } from '../common/security/password';
import { db } from '../database/db';

interface CustomerSession {
  customerId: number;
  refreshHash: string;
  expires: number;
}

const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const scrypt = promisify(scryptCallback);

@Injectable()
export class CustomerAuthService {
  private readonly sessions = new Map<string, CustomerSession>();
  private readonly secret =
    process.env.JWT_PUBLIC_KEY ||
    (process.env.NODE_ENV === 'production'
      ? ''
      : randomBytes(48).toString('hex'));

  constructor(private readonly jwt: JwtService) {
    if (this.secret.length < 32) {
      throw new Error('JWT_PUBLIC_KEY must contain at least 32 characters');
    }
  }

  async register(fullName: string, email: string, password: string) {
    const normalizedEmail = varchar<100>(email.trim().toLowerCase());
    const existingCustomer = await db.orm.public.Customer.select('id')
      .where({ email: normalizedEmail })
      .first();

    if (existingCustomer) {
      throw new ConflictException('A customer with this email already exists');
    }

    try {
      const customer = await db.orm.public.Customer.select('id').create({
        name: varchar<100>(fullName.trim()),
        email: normalizedEmail,
        passwordHash: varchar<255>(await hashPassword(password)),
        phone: null,
      });

      return {
        ...this.issue(customer.id),
        user: await this.profile(customer.id),
      };
    } catch (error) {
      throwIfUniqueViolation(
        error,
        'A customer with this email already exists',
      );
    }
  }

  async profile(id: number) {
    const customer = await db.orm.public.Customer.select(
      'id',
      'name',
      'email',
      'createdAt',
    ).first({ id });
    if (!customer) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return {
      id: customer.id,
      username: customer.email,
      email: customer.email,
      display_name: customer.name,
      status: 1,
      registered_at: String(customer.createdAt),
      roles: [{ name: 'CUSTOMER', display_name: 'CUSTOMER' }],
      permissions: [],
    };
  }

  async login(email: string, password: string) {
    const customer = await db.orm.public.Customer.select('id', 'passwordHash')
      .where({ email: varchar<100>(email.trim().toLowerCase()) })
      .first();
    const valid = await this.verifyPassword(password, customer?.passwordHash);
    if (!customer || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return {
      ...this.issue(customer.id),
      user: await this.profile(customer.id),
    };
  }

  async authenticate(token: string) {
    try {
      const payload = this.jwt.verify<{
        sub: number;
        sid: string;
        audience: string;
      }>(token, { secret: this.secret, algorithms: ['HS256'] });
      const session = this.sessions.get(payload.sid);
      if (
        payload.audience !== 'customer' ||
        !session ||
        session.expires <= Date.now() ||
        session.customerId !== payload.sub
      ) {
        throw new Error();
      }
      return {
        customer: await this.profile(payload.sub),
        sid: payload.sid,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired customer session');
    }
  }

  async refresh(token: string) {
    const sid = token.split('.')[0];
    const session = this.sessions.get(sid);
    if (
      !session ||
      session.expires <= Date.now() ||
      session.refreshHash !== digest(token)
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.profile(session.customerId);
    if (this.sessions.get(sid) !== session) {
      throw new UnauthorizedException('Refresh token already used');
    }
    this.sessions.delete(sid);
    return this.issue(session.customerId);
  }

  logout(sid: string) {
    this.sessions.delete(sid);
    return { success: true };
  }

  private issue(customerId: number) {
    this.prune();
    const sid = randomUUID();
    const refreshToken = `${sid}.${randomBytes(32).toString('hex')}`;
    this.sessions.set(sid, {
      customerId,
      refreshHash: digest(refreshToken),
      expires: Date.now() + 7 * 86_400_000,
    });
    return {
      access_token: this.jwt.sign(
        { sub: customerId, sid, audience: 'customer' },
        { secret: this.secret, algorithm: 'HS256', expiresIn: 900 },
      ),
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 900,
    };
  }

  private async verifyPassword(password: string, encoded?: string) {
    const parts = encoded?.split(':') ?? [];
    if (
      parts[0] !== 'scrypt' ||
      !/^[a-f0-9]{32}$/.test(parts[1] ?? '') ||
      !/^[a-f0-9]{128}$/.test(parts[2] ?? '')
    ) {
      await scrypt(password, 'invalid-account-timing-salt', 64);
      return false;
    }
    const expected = Buffer.from(parts[2], 'hex');
    return timingSafeEqual(
      (await scrypt(password, parts[1], 64)) as Buffer,
      expected,
    );
  }

  private prune() {
    for (const [id, session] of this.sessions) {
      if (session.expires <= Date.now()) this.sessions.delete(id);
    }
  }
}
