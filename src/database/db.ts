import 'dotenv/config';
import type { Contract } from '../../prisma/contract';
import contractJson from '../../prisma/contract.json';

type PostgresFactory =
  (typeof import('@prisma/orm-postgres/runtime'))['default'];

function createDatabase(postgres: PostgresFactory) {
  return postgres<Contract>({
    contractJson,
    url: process.env['DATABASE_URL']!,
  });
}

export let db: ReturnType<typeof createDatabase>;

let initialization: Promise<void> | undefined;

export function initializeDatabase(): Promise<void> {
  initialization ??= Promise.all([
    import('temporal-polyfill/full/global'),
    import('@prisma/orm-postgres/runtime'),
  ]).then(([, { default: postgres }]) => {
    db = createDatabase(postgres);
  });

  return initialization;
}
