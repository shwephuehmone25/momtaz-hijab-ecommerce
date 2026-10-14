#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/890dee5a6d3eafe475359916d3c17a43a39e5e3143d124e2c61e5a4bb8f265bd/contract';
import endContract from '../../snapshots/890dee5a6d3eafe475359916d3c17a43a39e5e3143d124e2c61e5a4bb8f265bd/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'CartStatus',
        members: ['ACTIVE', 'ABANDONED', 'CONVERTED'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'DiscountType',
        members: ['PERCENTAGE', 'FIXED_AMOUNT'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'OrderStatus',
        members: [
          'PENDING',
          'CONFIRMED',
          'PROCESSING',
          'SHIPPED',
          'DELIVERED',
          'CANCELLED',
          'REFUNDED',
        ],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'PaymentMethod',
        members: [
          'AMERICAN_EXPRESS',
          'APPLE_PAY',
          'DINERS_CLUB',
          'DISCOVER',
          'GOOGLE_PAY',
          'MASTERCARD',
          'SHOP_PAY',
          'VISA',
        ],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'PaymentStatus',
        members: ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'ProductStatus',
        members: ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'ShipmentStatus',
        members: [
          'PENDING',
          'PROCESSING',
          'SHIPPED',
          'IN_TRANSIT',
          'DELIVERED',
          'RETURNED',
          'CANCELLED',
        ],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'UserStatus',
        members: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'role_name',
        members: ['CUSTOMER', 'SUPER_ADMIN', 'ADMIN', 'ORDER_MANAGER', 'CONTENT_MANAGER'],
      }),
      this.createTable({
        schema: 'public',
        table: 'addresses',
        columns: [
          col('address_line1', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('address_line2', 'character varying(255)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('city', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('country', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('customer_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('postal_code', 'character varying(20)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('state', 'character varying(100)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('updated_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'cart_items',
        columns: [
          col('cart_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('product_variant_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('unit_price', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('updated_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'carts',
        columns: [
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('customer_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', '"CartStatus"', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'CartStatus' } },
          }),
          col('updated_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'categories',
        columns: [
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('image_url', 'character varying(255)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('name', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('parent_id', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('updated_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'contact_messages',
        columns: [
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('email', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('message', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('subject', 'character varying(150)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 150 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'coupons',
        columns: [
          col('code', 'character varying(50)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 50 } },
          }),
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('discount_type', '"DiscountType"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'DiscountType' } },
          }),
          col('discount_value', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('expires_at', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updated_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'customers',
        columns: [
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('email', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('password_hash', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('phone', 'character varying(20)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('updated_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'inventory',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('quantity', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('reserved_quantity', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updated_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('variant_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'newsletter_subscribers',
        columns: [
          col('email', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('subscribed_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('updated_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'order_coupons',
        columns: [
          col('coupon_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('discount_amount', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('order_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['order_id', 'coupon_id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'order_items',
        columns: [
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('order_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('product_name', 'character varying(150)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 150 } },
          }),
          col('quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('sku', 'character varying(50)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 50 } },
          }),
          col('total_price', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('unit_price', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('variant_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'orders',
        columns: [
          col('billing_address_line1', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('billing_address_line2', 'character varying(255)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('billing_city', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('billing_country', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('billing_name', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('billing_phone', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('billing_postal_code', 'character varying(20)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('billing_state', 'character varying(100)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('customer_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('discount_amount', 'numeric(10,2)', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('shipping_address_line1', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('shipping_address_line2', 'character varying(255)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('shipping_city', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('shipping_country', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('shipping_fee', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('shipping_name', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('shipping_phone', 'character varying(20)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('shipping_postal_code', 'character varying(20)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 20 } },
          }),
          col('shipping_state', 'character varying(100)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('status', '"OrderStatus"', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'OrderStatus' } },
          }),
          col('subtotal', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('total', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('updated_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'payments',
        columns: [
          col('amount', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('order_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('payment_method', '"PaymentMethod"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'PaymentMethod' } },
          }),
          col('status', '"PaymentStatus"', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'PaymentStatus' } },
          }),
          col('transaction_ref', 'character varying(100)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('updated_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'permissions',
        columns: [
          col('code', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('description', 'character varying(255)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updated_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'product_images',
        columns: [
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('image_url', 'character varying(500)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 500 } },
          }),
          col('product_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('sort_order', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'product_variants',
        columns: [
          col('color', 'character varying(50)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 50 } },
          }),
          col('compare_at_price', 'numeric(10,2)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('price', 'numeric(10,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('product_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('size', 'character varying(50)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 50 } },
          }),
          col('sku', 'character varying(50)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 50 } },
          }),
          col('status', '"ProductStatus"', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ProductStatus' } },
          }),
          col('style', 'character varying(50)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 50 } },
          }),
          col('updated_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'products',
        columns: [
          col('category_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'character varying(150)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 150 } },
          }),
          col('status', '"ProductStatus"', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ProductStatus' } },
          }),
          col('updated_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'reviews',
        columns: [
          col('comment', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('customer_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('product_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('rating', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updated_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'role_permissions',
        columns: [
          col('assigned_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('permission_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('role_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['role_id', 'permission_id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'roles',
        columns: [
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('description', 'character varying(255)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', '"role_name"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'role_name' } },
          }),
          col('updated_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'shipments',
        columns: [
          col('carrier', 'character varying(50)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 50 } },
          }),
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('delivered_at', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('order_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('shipped_at', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('status', '"ShipmentStatus"', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ShipmentStatus' } },
          }),
          col('tracking_number', 'character varying(100)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('updated_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'user_roles',
        columns: [
          col('assigned_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('role_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('user_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['user_id', 'role_id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'users',
        columns: [
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('email', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('last_login_at', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-temporal@1', typeParams: { precision: 3 } },
          }),
          col('name', 'character varying(100)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 100 } },
          }),
          col('password_hash', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('status', '"UserStatus"', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'UserStatus' } },
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
        table: 'addresses',
        index: 'addresses_customer_id_idx',
        columns: ['customer_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'cart_items',
        index: 'cart_items_cart_id_product_variant_id_key',
        columns: ['cart_id', 'product_variant_id'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'cart_items',
        index: 'cart_items_product_variant_id_idx',
        columns: ['product_variant_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'carts',
        index: 'carts_customer_id_status_idx',
        columns: ['customer_id', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'categories',
        index: 'categories_parent_id_idx',
        columns: ['parent_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'contact_messages',
        index: 'contact_messages_created_at_idx',
        columns: ['created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'coupons',
        index: 'coupons_code_key',
        columns: ['code'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'coupons',
        index: 'coupons_expires_at_idx',
        columns: ['expires_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'customers',
        index: 'customers_email_key',
        columns: ['email'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'inventory',
        index: 'inventory_variant_id_key',
        columns: ['variant_id'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'newsletter_subscribers',
        index: 'newsletter_subscribers_email_key',
        columns: ['email'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'order_coupons',
        index: 'order_coupons_coupon_id_idx',
        columns: ['coupon_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order_items',
        index: 'order_items_order_id_idx',
        columns: ['order_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order_items',
        index: 'order_items_variant_id_idx',
        columns: ['variant_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'orders',
        index: 'orders_customer_id_created_at_idx',
        columns: ['customer_id', 'created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'orders',
        index: 'orders_status_created_at_idx',
        columns: ['status', 'created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'payments',
        index: 'payments_order_id_created_at_idx',
        columns: ['order_id', 'created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'payments',
        index: 'payments_transaction_ref_idx',
        columns: ['transaction_ref'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'permissions',
        index: 'permissions_code_key',
        columns: ['code'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_images',
        index: 'product_images_product_id_sort_order_idx',
        columns: ['product_id', 'sort_order'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_variants',
        index: 'product_variants_product_id_status_idx',
        columns: ['product_id', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_variants',
        index: 'product_variants_sku_key',
        columns: ['sku'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'products',
        index: 'products_category_id_status_idx',
        columns: ['category_id', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'reviews',
        index: 'reviews_customer_id_product_id_key',
        columns: ['customer_id', 'product_id'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'reviews',
        index: 'reviews_product_id_created_at_idx',
        columns: ['product_id', 'created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'role_permissions',
        index: 'role_permissions_permission_id_idx',
        columns: ['permission_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'roles',
        index: 'roles_name_key',
        columns: ['name'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipments',
        index: 'shipments_order_id_idx',
        columns: ['order_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipments',
        index: 'shipments_tracking_number_idx',
        columns: ['tracking_number'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'user_roles',
        index: 'user_roles_role_id_idx',
        columns: ['role_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'users',
        index: 'users_email_key',
        columns: ['email'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'users',
        index: 'users_status_idx',
        columns: ['status'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'addresses',
        foreignKey: {
          name: 'addresses_customer_id_fkey',
          columns: ['customer_id'],
          references: { schema: 'public', table: 'customers', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'cart_items',
        foreignKey: {
          name: 'cart_items_cart_id_fkey',
          columns: ['cart_id'],
          references: { schema: 'public', table: 'carts', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'cart_items',
        foreignKey: {
          name: 'cart_items_product_variant_id_fkey',
          columns: ['product_variant_id'],
          references: { schema: 'public', table: 'product_variants', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'carts',
        foreignKey: {
          name: 'carts_customer_id_fkey',
          columns: ['customer_id'],
          references: { schema: 'public', table: 'customers', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'categories',
        foreignKey: {
          name: 'categories_parent_id_fkey',
          columns: ['parent_id'],
          references: { schema: 'public', table: 'categories', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'inventory',
        foreignKey: {
          name: 'inventory_variant_id_fkey',
          columns: ['variant_id'],
          references: { schema: 'public', table: 'product_variants', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order_coupons',
        foreignKey: {
          name: 'order_coupons_order_id_fkey',
          columns: ['order_id'],
          references: { schema: 'public', table: 'orders', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order_coupons',
        foreignKey: {
          name: 'order_coupons_coupon_id_fkey',
          columns: ['coupon_id'],
          references: { schema: 'public', table: 'coupons', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order_items',
        foreignKey: {
          name: 'order_items_order_id_fkey',
          columns: ['order_id'],
          references: { schema: 'public', table: 'orders', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order_items',
        foreignKey: {
          name: 'order_items_variant_id_fkey',
          columns: ['variant_id'],
          references: { schema: 'public', table: 'product_variants', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'orders',
        foreignKey: {
          name: 'orders_customer_id_fkey',
          columns: ['customer_id'],
          references: { schema: 'public', table: 'customers', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'payments',
        foreignKey: {
          name: 'payments_order_id_fkey',
          columns: ['order_id'],
          references: { schema: 'public', table: 'orders', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_images',
        foreignKey: {
          name: 'product_images_product_id_fkey',
          columns: ['product_id'],
          references: { schema: 'public', table: 'products', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_variants',
        foreignKey: {
          name: 'product_variants_product_id_fkey',
          columns: ['product_id'],
          references: { schema: 'public', table: 'products', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'products',
        foreignKey: {
          name: 'products_category_id_fkey',
          columns: ['category_id'],
          references: { schema: 'public', table: 'categories', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'reviews',
        foreignKey: {
          name: 'reviews_customer_id_fkey',
          columns: ['customer_id'],
          references: { schema: 'public', table: 'customers', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'reviews',
        foreignKey: {
          name: 'reviews_product_id_fkey',
          columns: ['product_id'],
          references: { schema: 'public', table: 'products', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'role_permissions',
        foreignKey: {
          name: 'role_permissions_role_id_fkey',
          columns: ['role_id'],
          references: { schema: 'public', table: 'roles', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'role_permissions',
        foreignKey: {
          name: 'role_permissions_permission_id_fkey',
          columns: ['permission_id'],
          references: { schema: 'public', table: 'permissions', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shipments',
        foreignKey: {
          name: 'shipments_order_id_fkey',
          columns: ['order_id'],
          references: { schema: 'public', table: 'orders', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'user_roles',
        foreignKey: {
          name: 'user_roles_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'user_roles',
        foreignKey: {
          name: 'user_roles_role_id_fkey',
          columns: ['role_id'],
          references: { schema: 'public', table: 'roles', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
