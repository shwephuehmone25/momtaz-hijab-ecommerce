jest.mock('../database/db', () => ({
  db: { orm: { public: { User: { select: jest.fn() } } } },
}));
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { db } from '../database/db';
import { hashPassword } from '../common/security/password';
describe('Admin authentication', () => {
  let service: AuthService;
  const profile = {
    id: 1,
    username: 'admin@example.com',
    email: 'admin@example.com',
    display_name: 'Admin',
    status: 1,
    registered_at: '',
    roles: [{ name: 'SUPER_ADMIN', display_name: 'Super Admin' }],
    permissions: ['*'],
  };
  beforeEach(async () => {
    process.env.JWT_PUBLIC_KEY =
      'test-secret-only-with-at-least-thirty-two-characters';
    service = new AuthService(new JwtService());
    const first = jest.fn().mockResolvedValue({
      id: 1,
      passwordHash: await hashPassword('correct-password'),
    });
    (db.orm.public.User.select as jest.Mock).mockReturnValue({
      where: () => ({ first }),
    });
    jest.spyOn(service, 'profile').mockResolvedValue(profile);
  });
  it('rejects an incorrect password', async () => {
    await expect(service.login('admin@example.com', 'wrong')).rejects.toThrow(
      'Invalid email or password',
    );
  });
  it('issues tokens and returns no password hash', async () => {
    const result = await service.login('admin@example.com', 'correct-password');
    expect(result.user).toEqual(profile);
    expect(result.user).not.toHaveProperty('passwordHash');
    expect((await service.authenticate(result.access_token)).user.id).toBe(1);
    await expect(
      service.authenticate(result.access_token + 'tampered'),
    ).rejects.toThrow();
  });
  it('rotates refresh tokens and rejects reuse', async () => {
    const result = await service.login('admin@example.com', 'correct-password');
    const refreshed = await service.refresh(result.refresh_token);
    await expect(service.refresh(result.refresh_token)).rejects.toThrow();
    await expect(service.authenticate(result.access_token)).rejects.toThrow();
    expect((await service.authenticate(refreshed.access_token)).user.id).toBe(
      1,
    );
  });
  it('allows only one concurrent refresh', async () => {
    const result = await service.login('admin@example.com', 'correct-password');
    const outcomes = await Promise.allSettled([
      service.refresh(result.refresh_token),
      service.refresh(result.refresh_token),
    ]);
    expect(
      outcomes.filter((outcome) => outcome.status === 'fulfilled'),
    ).toHaveLength(1);
  });
  it('revokes both tokens on logout', async () => {
    const result = await service.login('admin@example.com', 'correct-password');
    service.logout((await service.authenticate(result.access_token)).sid);
    await expect(service.authenticate(result.access_token)).rejects.toThrow();
    await expect(service.refresh(result.refresh_token)).rejects.toThrow();
  });
  it('rejects inactive accounts and customer-only roles', async () => {
    jest.spyOn(service, 'profile').mockRestore();
    const first = jest
      .fn()
      .mockResolvedValue({ id: 1, status: 'INACTIVE', roles: [] });
    const query = { include: () => query, first };
    (db.orm.public.User.select as jest.Mock).mockReturnValue(query);
    await expect(service.profile(1)).rejects.toThrow();
    first.mockResolvedValue({
      id: 1,
      status: 'ACTIVE',
      roles: [{ role: { name: 'CUSTOMER', permissions: [] } }],
    });
    await expect(service.profile(1)).rejects.toThrow('Admin access required');
  });
});
