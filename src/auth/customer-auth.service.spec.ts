jest.mock('../database/db', () => ({
  db: { orm: { public: { Customer: { select: jest.fn() } } } },
}));

import { JwtService } from '@nestjs/jwt';
import { hashPassword } from '../common/security/password';
import { db } from '../database/db';
import { CustomerAuthService } from './customer-auth.service';

describe('Customer authentication', () => {
  let service: CustomerAuthService;
  let first: jest.Mock;
  let create: jest.Mock;

  beforeEach(async () => {
    process.env.JWT_PUBLIC_KEY =
      'test-secret-only-with-at-least-thirty-two-characters';
    service = new CustomerAuthService(new JwtService());
    first = jest.fn();
    create = jest.fn();
    const query = { where: () => query, first, create };
    (db.orm.public.Customer.select as jest.Mock).mockReturnValue(query);
    first.mockResolvedValue({
      id: 7,
      name: 'Customer',
      email: 'customer@example.com',
      passwordHash: await hashPassword('correct-password'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  });

  it('registers a customer with a normalized email and hashed password', async () => {
    first.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 8,
      name: 'New Customer',
      email: 'new@example.com',
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    create.mockResolvedValueOnce({ id: 8 });

    const result = await service.register(
      '  New Customer  ',
      '  NEW@example.com ',
      'strong-password',
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Customer',
        email: 'new@example.com',
        // Jest asymmetric matchers are intentionally dynamic test values.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        passwordHash: expect.stringMatching(/^scrypt:/),
      }),
    );
    expect(result.user.email).toBe('new@example.com');
    expect(result.access_token).toEqual(expect.any(String));
  });

  it('rejects registration when the email is already registered', async () => {
    first.mockResolvedValueOnce({ id: 7 });

    await expect(
      service.register('Customer', 'customer@example.com', 'strong-password'),
    ).rejects.toThrow('A customer with this email already exists');
    expect(create).not.toHaveBeenCalled();
  });

  it('issues a customer-scoped session and authenticates it', async () => {
    const result = await service.login(
      'customer@example.com',
      'correct-password',
    );

    const authenticated = await service.authenticate(result.access_token);

    expect(authenticated.customer.id).toBe(7);
    expect(result.user.roles).toEqual([
      { name: 'CUSTOMER', display_name: 'CUSTOMER' },
    ]);
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('rejects invalid credentials and tampered access tokens', async () => {
    await expect(
      service.login('customer@example.com', 'wrong-password'),
    ).rejects.toThrow('Invalid email or password');

    const result = await service.login(
      'customer@example.com',
      'correct-password',
    );
    await expect(
      service.authenticate(`${result.access_token}tampered`),
    ).rejects.toThrow('Invalid or expired customer session');
  });

  it('rotates refresh tokens and revokes a logged-out session', async () => {
    const result = await service.login(
      'customer@example.com',
      'correct-password',
    );
    const refreshed = await service.refresh(result.refresh_token);
    await expect(service.refresh(result.refresh_token)).rejects.toThrow();

    const authenticated = await service.authenticate(refreshed.access_token);
    service.logout(authenticated.sid);
    await expect(
      service.authenticate(refreshed.access_token),
    ).rejects.toThrow();
  });
});
