import { db } from '../src/database/db';
import { varchar } from '../src/common/database/varchar';
import { hashPassword } from '../src/common/security/password';
import { RoleName } from '../src/users/dto/user-enums';

const resources = [
  'users',
  'roles',
  'customers',
  'categories',
  'products',
  'inventory',
  'orders',
  'payments',
  'shipments',
  'coupons',
  'reviews',
  'newsletter',
  'contact_messages',
] as const;

type Resource = (typeof resources)[number];
const roleDefinitions: Record<
  RoleName,
  { description: string; resources: readonly Resource[] }
> = {
  CUSTOMER: {
    description: 'Customer account; no admin permissions',
    resources: [],
  },
  SUPER_ADMIN: { description: 'Full administration access', resources },
  ADMIN: {
    description: 'Store administration without role management',
    resources: resources.filter((resource) => resource !== 'roles'),
  },
  ORDER_MANAGER: {
    description: 'Order fulfillment and payment management',
    resources: ['orders', 'payments', 'shipments', 'inventory'],
  },
  CONTENT_MANAGER: {
    description: 'Catalog and customer content management',
    resources: [
      'categories',
      'products',
      'coupons',
      'reviews',
      'newsletter',
      'contact_messages',
    ],
  },
};

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not defined');
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@gmail.com')
    .trim()
    .toLowerCase();
  const name = (process.env.SEED_ADMIN_NAME ?? 'Default Admin').trim();
  const password = process.env.SEED_ADMIN_PASSWORD ?? '@dmin123';
  if (!email || email.length > 100 || !name || name.length > 100 || !password) {
    throw new Error(
      'Admin email and name must be 1–100 characters and password must not be empty',
    );
  }

  await db.transaction(async (tx) => {
    const permissionIds = new Map<string, number>();
    for (const resource of resources) {
      for (const action of ['read', 'manage'] as const) {
        const code = varchar<100>(`${resource}.${action}`);
        const description = varchar<255>(
          `${action === 'read' ? 'View' : 'Manage'} ${resource.replaceAll('_', ' ')}`,
        );
        let permission = await tx.orm.public.Permission.where({ code }).first();
        if (permission) {
          await tx.orm.public.Permission.where({ id: permission.id }).update({
            description,
          });
        } else {
          permission = await tx.orm.public.Permission.create({
            code,
            description,
          });
        }
        permissionIds.set(code, permission.id);
      }
    }

    const roleIds = new Map<RoleName, number>();
    for (const roleName of Object.values(RoleName)) {
      const definition = roleDefinitions[roleName];
      const description = varchar<255>(definition.description);
      let role = await tx.orm.public.Role.where({ name: roleName }).first();
      if (role) {
        await tx.orm.public.Role.where({ id: role.id }).update({ description });
      } else {
        role = await tx.orm.public.Role.create({ name: roleName, description });
      }
      roleIds.set(roleName, role.id);
      // Add default grants without removing existing custom assignments.
      for (const resource of definition.resources) {
        for (const action of ['read', 'manage']) {
          const assignment = {
            roleId: role.id,
            permissionId: permissionIds.get(`${resource}.${action}`)!,
          };
          if (!(await tx.orm.public.RolePermission.where(assignment).first())) {
            await tx.orm.public.RolePermission.create(assignment);
          }
        }
      }
    }

    // Preserve an existing admin's password and account details on repeat runs.
    let admin = await tx.orm.public.User.where({
      email: varchar<100>(email),
    }).first();
    if (!admin) {
      admin = await tx.orm.public.User.create({
        name: varchar<100>(name),
        email: varchar<100>(email),
        passwordHash: varchar<255>(await hashPassword(password)),
        status: 'ACTIVE',
        lastLoginAt: null,
      });
    }
    const assignment = {
      userId: admin.id,
      roleId: roleIds.get(RoleName.SUPER_ADMIN)!,
    };
    if (!(await tx.orm.public.UserRole.where(assignment).first())) {
      await tx.orm.public.UserRole.create(assignment);
    }
  });

  console.log(`Seeded default admin: ${email}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close();
  });
