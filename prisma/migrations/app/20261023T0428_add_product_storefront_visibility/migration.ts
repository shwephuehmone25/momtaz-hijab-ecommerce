#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/6fdaec233c09b37845dc467978d15767b45f1340ae4ef77089a037b0181519a8/contract';
import startContract from '../../snapshots/6fdaec233c09b37845dc467978d15767b45f1340ae4ef77089a037b0181519a8/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/80a325a961ac0f9165e559b53d31538edbd0344ba2aa59c3b7cb23f98065e974/contract';
import endContract from '../../snapshots/80a325a961ac0f9165e559b53d31538edbd0344ba2aa59c3b7cb23f98065e974/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'products',
        column: col('best_seller_order', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'products',
        column: col('is_best_seller', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'products',
        column: col('is_visible', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'products',
        index: 'products_status_is_visible_is_best_seller_best_seller_order_idx',
        columns: ['status', 'is_visible', 'is_best_seller', 'best_seller_order'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
