import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const isServer = typeof window === 'undefined';

let prismaClient: PrismaClient;

if (isServer) {
  if (globalForPrisma.prisma) {
    prismaClient = globalForPrisma.prisma;
  } else {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/postgres';

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    prismaClient = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = prismaClient;
    }
  }
} else {
  prismaClient = null as unknown as PrismaClient;
}

export const db = prismaClient;
