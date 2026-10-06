import { db } from '../database/db';
import { UsersService } from '../users/users.service';
import { RoleName } from '../users/dto';
async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (
    !email ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
    email.length > 100 ||
    !password ||
    password.length < 8 ||
    password.length > 128
  ) {
    throw new Error(
      'Set ADMIN_EMAIL and ADMIN_PASSWORD (8–128 characters) to provision the initial administrator',
    );
  }
  await db.connect();
  try {
    if (await db.orm.public.User.select('id').first())
      throw new Error(
        'Bootstrap is only allowed on an empty user table; use authenticated user management',
      );
    await new UsersService().create({
      name: 'Store Administrator',
      email,
      password,
      roles: [RoleName.SUPER_ADMIN],
    });
    console.log('Initial administrator created');
  } finally {
    await db.close();
  }
}
void bootstrapAdmin().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Administrator bootstrap failed',
  );
  process.exitCode = 1;
});
