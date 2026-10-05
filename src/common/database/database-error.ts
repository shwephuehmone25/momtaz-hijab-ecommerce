import { ConflictException } from '@nestjs/common';

type DatabaseError = {
  sqlState?: string;
  constraint?: string;
};

export function throwIfUniqueViolation(error: unknown, message: string): never {
  const databaseError = error as DatabaseError;

  if (databaseError.sqlState === '23505') {
    throw new ConflictException(message);
  }

  throw error;
}
