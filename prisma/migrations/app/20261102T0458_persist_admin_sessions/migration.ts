#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/64ff5bfac949332737a5ce1b3d4d43656aef73d77e9e91ec58e27bb2be90ea12/contract';
import endContract from '../../snapshots/64ff5bfac949332737a5ce1b3d4d43656aef73d77e9e91ec58e27bb2be90ea12/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/80a325a961ac0f9165e559b53d31538edbd0344ba2aa59c3b7cb23f98065e974/contract';
import startContract from '../../snapshots/80a325a961ac0f9165e559b53d31538edbd0344ba2aa59c3b7cb23f98065e974/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'admin_sessions',
        columns: [
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('expires_at', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('refresh_hash', 'character varying(64)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 64 } },
          }),
          col('updated_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('user_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('version', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'admin_sessions',
        index: 'admin_sessions_expires_at_idx',
        columns: ['expires_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'admin_sessions',
        index: 'admin_sessions_user_id_idx',
        columns: ['user_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'admin_sessions',
        foreignKey: {
          name: 'admin_sessions_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
