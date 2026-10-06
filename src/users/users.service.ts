import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../database/db';
import { hashPassword } from '../common/security/password';
import { throwIfUniqueViolation } from '../common/database/database-error';
import { varchar } from '../common/database/varchar';
import { CreateUserDto, RoleName, UpdateUserDto } from './dto';

const userFields = [
  'id',
  'name',
  'email',
  'status',
  'lastLoginAt',
  'createdAt',
  'updatedAt',
] as const;

@Injectable()
export class UsersService {
  private userQuery() {
    return db.orm.public.User.select(...userFields).include('roles', (roles) =>
      roles.select('roleId').include('role', (role) => role.select('name')),
    );
  }

  private serializeUser<
    T extends { roles: Array<{ role: { name: string } | null }> },
  >(user: T) {
    return {
      ...user,
      roles: user.roles.flatMap((assignment) =>
        assignment.role ? [assignment.role.name] : [],
      ),
    };
  }

  async create(dto: CreateUserDto) {
    const roleNames = [...new Set(dto.roles ?? [RoleName.CUSTOMER])];

    try {
      const userId = await db.transaction(async (tx) => {
        const user = await tx.orm.public.User.create({
          name: varchar<100>(dto.name.trim()),
          email: varchar<100>(dto.email.trim().toLowerCase()),
          passwordHash: varchar<255>(await hashPassword(dto.password)),
          status: dto.status ?? 'ACTIVE',
          lastLoginAt: null,
        });

        for (const name of roleNames) {
          let role = await tx.orm.public.Role.where({ name }).first();
          role ??= await tx.orm.public.Role.create({
            name,
            description: null,
          });
          await tx.orm.public.UserRole.create({
            userId: user.id,
            roleId: role.id,
          });
        }

        return user.id;
      });

      return this.findOne(userId);
    } catch (error) {
      throwIfUniqueViolation(error, 'A user with this email already exists');
    }
  }

  async findAll(page: number, limit: number) {
    const [users, totalResult] = await Promise.all([
      this.userQuery()
        .orderBy((user) => user.createdAt.desc())
        .limit(limit)
        .offset((page - 1) * limit)
        .all(),
      db.orm.public.User.aggregate((aggregate) => ({
        total: aggregate.count(),
      })),
    ]);

    return {
      items: users.map((user) => this.serializeUser(user)),
      page,
      limit,
      total: totalResult.total,
    };
  }

  async findOne(id: number) {
    const user = await this.userQuery().first({ id });

    if (!user) {
      throw new NotFoundException(`User ${id} was not found`);
    }

    return this.serializeUser(user);
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);

    try {
      await db.transaction(async (tx) => {
        const changes = {
          ...(dto.name !== undefined && {
            name: varchar<100>(dto.name.trim()),
          }),
          ...(dto.email !== undefined && {
            email: varchar<100>(dto.email.trim().toLowerCase()),
          }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.password !== undefined && {
            passwordHash: varchar<255>(await hashPassword(dto.password)),
          }),
        };

        if (Object.keys(changes).length > 0) {
          await tx.orm.public.User.where({ id }).update(changes);
        }

        if (dto.roles !== undefined) {
          const currentRoles = await tx.orm.public.UserRole.select('roleId')
            .where({ userId: id })
            .all();

          for (const currentRole of currentRoles) {
            await tx.orm.public.UserRole.where({
              userId: id,
              roleId: currentRole.roleId,
            }).delete();
          }

          for (const name of [...new Set(dto.roles)]) {
            let role = await tx.orm.public.Role.where({ name }).first();
            role ??= await tx.orm.public.Role.create({
              name,
              description: null,
            });
            await tx.orm.public.UserRole.create({
              userId: id,
              roleId: role.id,
            });
          }
        }
      });

      return this.findOne(id);
    } catch (error) {
      throwIfUniqueViolation(error, 'A user with this email already exists');
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    await db.orm.public.User.where({ id }).delete();

    return { message: `User ${id} deleted` };
  }
}
