import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  createHash,
  createPrivateKey,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { db } from '../database/db';
import { varchar } from '../common/database/varchar';
import { getJwtPrivateKey, getJwtPublicKey } from './crypto.utils';

const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const scrypt = promisify(scryptCallback);

@Injectable()
export class AuthService {
  private readonly privateKey = process.env.JWT_PRIVATE_KEY
    ? getJwtPrivateKey()
    : undefined;
  private readonly publicKey = getJwtPublicKey();
  private readonly algorithm = this.privateKey
    ? createPrivateKey(this.privateKey).asymmetricKeyType === 'ec'
      ? ('ES256' as const)
      : ('RS256' as const)
    : ('HS256' as const);
  constructor(private readonly jwt: JwtService) {
    if (!this.privateKey && this.publicKey.length < 32)
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
    return { ...(await this.issue(user.id)), user: profile };
  }
  private async issue(userId: number) {
    const sid = randomUUID();
    const refresh_token = `${sid}.${randomBytes(32).toString('hex')}`;
    await db.orm.public.AdminSession.create({
      id: sid,
      userId,
      refreshHash: varchar<64>(digest(refresh_token)),
      version: 0,
      expiresAt: BigInt(Date.now() + 7 * 86_400_000),
    });
    return this.tokens(userId, sid, 0, refresh_token);
  }
  private tokens(
    userId: number,
    sid: string,
    version: number,
    refresh_token: string,
  ) {
    return {
      access_token: this.jwt.sign(
        { sub: userId, sid, version },
        this.privateKey
          ? {
              secret: this.privateKey,
              algorithm: this.algorithm,
              expiresIn: 900,
            }
          : {
              secret: this.publicKey,
              algorithm: 'HS256',
              expiresIn: 900,
            },
      ),
      refresh_token,
      token_type: 'Bearer',
      expires_in: 900,
    };
  }
  async authenticate(token: string) {
    let payload: { sub: number; sid: string; version: number };
    try {
      payload = this.jwt.verify<{
        sub: number;
        sid: string;
        version: number;
      }>(token, {
        secret: this.publicKey,
        algorithms: [this.algorithm],
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
    const session = await db.orm.public.AdminSession.select(
      'userId',
      'version',
      'expiresAt',
    ).first({ id: payload.sid });
    if (
      !session ||
      session.expiresAt <= BigInt(Date.now()) ||
      session.userId !== payload.sub ||
      session.version !== payload.version
    ) {
      throw new UnauthorizedException('Invalid or expired session');
    }
    return { user: await this.profile(payload.sub), sid: payload.sid };
  }
  async refresh(token: string) {
    const sid = token.split('.')[0];
    const refreshHash = varchar<64>(digest(token));
    const session = await db.orm.public.AdminSession.select(
      'userId',
      'version',
      'expiresAt',
    ).first({ id: sid, refreshHash });
    if (!session || session.expiresAt <= BigInt(Date.now()))
      throw new UnauthorizedException('Invalid refresh token');
    await this.profile(session.userId);
    const refresh_token = `${sid}.${randomBytes(32).toString('hex')}`;
    const version = session.version + 1;
    const updated = await db.orm.public.AdminSession.where({
      id: sid,
      refreshHash,
      version: session.version,
    }).update({ refreshHash: varchar<64>(digest(refresh_token)), version });
    if (!updated) throw new UnauthorizedException('Refresh token already used');
    return this.tokens(session.userId, sid, version, refresh_token);
  }
  async logout(sid: string) {
    await db.orm.public.AdminSession.where({ id: sid }).delete();
    return { success: true };
  }
}
