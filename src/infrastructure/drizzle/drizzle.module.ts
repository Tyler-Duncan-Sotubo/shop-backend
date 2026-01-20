// src/drizzle/drizzle.module.ts
import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool, PoolConfig } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { db } from './types/drizzle';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');
export const PG_POOL = Symbol('PG_POOL');

function buildPoolConfig(cfg: ConfigService): PoolConfig {
  const isProd = process.env.NODE_ENV === 'production';

  const connectionString = cfg.get<string>('DATABASE_URL');
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  // If you're connecting to PgBouncer, set PGBOUNCER=1 (recommended).
  const usingPgbouncer = cfg.get<string>('PGBOUNCER') === '1';

  /**
   * SSL policy (simple and PgBouncer-friendly):
   * - Default: ssl = false (works for local Postgres and most PgBouncer setups)
   * - If PGSSL_DISABLE=1 => force ssl=false
   * - If PG_CA_CERT is provided => ssl with strict verification
   * - Else if PGSSL_ENABLE=1 => ssl with rejectUnauthorized=false (useful for managed/self-signed)
   *
   * Notes:
   * - If your endpoint does NOT support SSL (common with PgBouncer), leave SSL off.
   * - If your managed Postgres requires SSL, use PG_CA_CERT (best) or PGSSL_ENABLE=1.
   */
  const sslDisabled = cfg.get<string>('PGSSL_DISABLE') === '1';
  const sslEnabled = cfg.get<string>('PGSSL_ENABLE') === '1';
  const ca = cfg.get<string>('PG_CA_CERT'); // PEM chain (optional)

  let ssl: PoolConfig['ssl'] = false;

  if (!sslDisabled) {
    if (ca) {
      ssl = { rejectUnauthorized: true, ca };
    } else if (sslEnabled) {
      ssl = { rejectUnauthorized: false };
    } else {
      ssl = false;
    }
  }

  const config: PoolConfig = {
    connectionString,
    ssl,

    // With PgBouncer, keep app pool small (PgBouncer is the pool).
    max: Number(
      process.env.PG_POOL_MAX || (usingPgbouncer ? 5 : isProd ? 20 : 10),
    ),

    idleTimeoutMillis: Number(
      process.env.PG_IDLE_TIMEOUT_MS || (isProd ? 30_000 : 10_000),
    ),
    connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS || 5_000),

    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  };

  // Optional: recycle clients in dev to reduce long-lived socket flakes (pg >= 8.11)
  if (!isProd) {
    (config as any).maxUses = Number(process.env.PG_MAX_USES || 500);
  }

  return config;
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    // Shared pg.Pool (singleton, with error handler)
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const g = globalThis as any;
        if (!g.__PG_POOL__) {
          const pool = new Pool(buildPoolConfig(config));

          // Prevent process crash when an idle client dies (dev proxies, hot reload, etc.)
          pool.on('error', (err) => {
            // eslint-disable-next-line no-console
            console.warn(
              '[pg pool] idle client error:',
              err?.code || err?.message || err,
            );
          });

          g.__PG_POOL__ = pool;
        }
        return g.__PG_POOL__ as Pool;
      },
    },

    // Drizzle instance
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool) => drizzle(pool, { schema }) as db,
    },

    // Graceful shutdown (only close in prod)
    {
      provide: 'DB_SHUTDOWN_HOOK',
      inject: [PG_POOL],
      useFactory: (pool: Pool): OnApplicationShutdown => ({
        async onApplicationShutdown() {
          if (process.env.NODE_ENV === 'production') {
            try {
              await pool.end();
            } catch {
              /* ignore */
            }
          }
        },
      }),
    },
  ],
  exports: [DRIZZLE, PG_POOL],
})
export class DrizzleModule {}
