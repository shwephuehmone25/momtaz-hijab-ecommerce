#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/6fdaec233c09b37845dc467978d15767b45f1340ae4ef77089a037b0181519a8/contract';
import endContract from '../../snapshots/6fdaec233c09b37845dc467978d15767b45f1340ae4ef77089a037b0181519a8/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/890dee5a6d3eafe475359916d3c17a43a39e5e3143d124e2c61e5a4bb8f265bd/contract';
import startContract from '../../snapshots/890dee5a6d3eafe475359916d3c17a43a39e5e3143d124e2c61e5a4bb8f265bd/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'product_attribute_values',
        columns: [
          col('attribute_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('order_by', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updated_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('value', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'product_attributes',
        columns: [
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('order_by', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('slug', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('type', 'character varying(20)', {
            notNull: true,
            default: lit('select'),
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('updated_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_attribute_values',
        index: 'product_attribute_values_attribute_id_order_by_idx',
        columns: ['attribute_id', 'order_by'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_attribute_values',
        index: 'product_attribute_values_attribute_id_value_key',
        columns: ['attribute_id', 'value'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_attributes',
        index: 'product_attributes_slug_key',
        columns: ['slug'],
        extras: { unique: true },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_attribute_values',
        foreignKey: {
          name: 'product_attribute_values_attribute_id_fkey',
          columns: ['attribute_id'],
          references: { schema: 'public', table: 'product_attributes', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
