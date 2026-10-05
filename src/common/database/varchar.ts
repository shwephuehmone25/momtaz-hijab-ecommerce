import type { Varchar } from '@prisma/orm-postgres/target/codec-types';

export function varchar<N extends number>(value: string): Varchar<N> {
  return value as Varchar<N>;
}
