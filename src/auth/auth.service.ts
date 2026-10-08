import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { db } from '../database/db';
import { varchar } from '../common/database/varchar';

interface Session {
  userId: number;
  refreshHash: string;
  expires: number;
}
import { createHash } from 'node:crypto';
const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const scrypt = promisify(scryptCallback);

@Injectable()
export class AuthService {
  // Sessions intentionally expire on process restart; no raw refresh tokens are stored.
  private readonly sessions = new Map<string, Session>();
  private readonly secret =
    process.env.JWT_PUBLIC_KEY ||
    (process.env.NODE_ENV === 'production'
      ? ''
      : randomBytes(48).toString('hex'));
  constructor(private readonly jwt: JwtService) {
    if (this.secret.length < 32)
      throw new Error('JWT_PUBLIC_KEY must contain at least 32 characters');
  }
  async profile(id: number) {
    const user = await db.orm.public.User.select(
      'id',
      'name',
      'email',
      'status',
      'createdAt',
    )
      .include('roles', (roles) =>
        roles
          .select('roleId')
          .include('role', (role) =>
            role
              .select('name')
              .include('permissions', (permissions) =>
                permissions
                  .select('permissionId')
                  .include('permission', (permission) =>
                    permission.select('code'),
                  ),
              ),
          ),
      )
      .first({ id });
    if (!user || user.status !== 'ACTIVE')
      throw new UnauthorizedException(
        'Invalid credentials or inactive account',
      );
    const roles = user.roles.flatMap((item) => (item.role ? [item.role] : []));
    if (!roles.some((role) => role.name !== 'CUSTOMER'))
      throw new UnauthorizedException('Admin access required');
    return {
      id: user.id,
      username: user.email,
      email: user.email,
      display_name: user.name,
      status: 1,
      registered_at: String(user.createdAt),
      roles: roles.map((role) => ({
        name: role.name,
        display_name: role.name,
      })),
      permissions: roles.some((role) => role.name === 'SUPER_ADMIN')
        ? ['*']
        : [
            ...new Set(
              roles.flatMap((role) =>
                role.permissions.flatMap((item) =>
                  item.permission ? [item.permission.code] : [],
                ),
              ),
            ),
          ],
    };
  }
  async login(username: string, password: string) {
    const user = await db.orm.public.User.select('id', 'passwordHash')
      .where({ email: varchar<100>(username.trim().toLowerCase()) })
      .first();
    const parts = user?.passwordHash.split(':') ?? [];
    let valid = false;
    if (
      parts[0] === 'scrypt' &&
      /^[a-f0-9]{32}$/.test(parts[1] ?? '') &&
      /^[a-f0-9]{128}$/.test(parts[2] ?? '')
    ) {
      const expected = Buffer.from(parts[2], 'hex');
      valid = timingSafeEqual(
        (await scrypt(password, parts[1], 64)) as Buffer,
        expected,
      );
    } else {
      await scrypt(password, 'invalid-account-timing-salt', 64);
    }
    if (!user || !valid)
      throw new UnauthorizedException('Invalid email or password');
    const profile = await this.profile(user.id);
    this.prune();
    return { ...this.issue(user.id), user: profile };
  }
  private prune() {
    for (const [id, session] of this.sessions)
      if (session.expires <= Date.now()) this.sessions.delete(id);
  }
  private issue(userId: number) {
    const sid = randomUUID();
    const refresh_token = `${sid}.${randomBytes(32).toString('hex')}`;
    this.sessions.set(sid, {
      userId,
      refreshHash: digest(refresh_token),
      expires: Date.now() + 7 * 86400000,
    });
    return {
      access_token: this.jwt.sign(
        { sub: userId, sid },
        { secret: this.secret, algorithm: 'HS256', expiresIn: 900 },
      ),
      refresh_token,
      token_type: 'Bearer',
      expires_in: 900,
    };
  }
  async authenticate(token: string) {
    try {
      const payload = this.jwt.verify<{ sub: number; sid: string }>(token, {
        secret: this.secret,
        algorithms: ['HS256'],
      });
      const session = this.sessions.get(payload.sid);
      if (
        !session ||
        session.expires <= Date.now() ||
        session.userId !== payload.sub
      )
        throw new Error();
      return { user: await this.profile(payload.sub), sid: payload.sid };
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
  async refresh(token: string) {
    const sid = token.split('.')[0];
    const session = this.sessions.get(sid);
    if (
      !session ||
      session.expires <= Date.now() ||
      session.refreshHash !== digest(token)
    )
      throw new UnauthorizedException('Invalid refresh token');
    await this.profile(session.userId);
    if (this.sessions.get(sid) !== session)
      throw new UnauthorizedException('Refresh token already used');
    this.sessions.delete(sid);
    return this.issue(session.userId);
  }
  logout(sid: string) {
    this.sessions.delete(sid);
    return { success: true };
  }
}
