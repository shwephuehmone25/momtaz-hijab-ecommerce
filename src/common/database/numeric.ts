import type { Numeric } from '@prisma/orm-postgres/target/codec-types';

export function numeric<P extends number, S extends number>(
  value: string,
): Numeric<P, S> {
  return value as Numeric<P, S>;
}
