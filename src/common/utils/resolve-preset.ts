export type Bucket = '15m' | 'day' | 'month';

export type Preset =
  | '30m'
  | '12h'
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | '90d'
  | '365d'
  | 'last_week'
  | 'last_month'
  | '12m';

export function resolvePreset(preset: Preset): {
  from: Date;
  to: Date;
  bucket: Bucket;
} {
  const now = new Date();

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const addDays = (d: Date, n: number) =>
    new Date(d.getTime() + n * 24 * 60 * 60 * 1000);

  const addMinutes = (d: Date, n: number) =>
    new Date(d.getTime() + n * 60 * 1000);

  const addMonths = (d: Date, n: number) =>
    new Date(d.getFullYear(), d.getMonth() + n, 1);

  switch (preset) {
    // ─────────────────────────────
    // Intraday
    // ─────────────────────────────
    case '30m':
      return {
        from: addMinutes(now, -30),
        to: now,
        bucket: '15m',
      };

    case '12h':
      return {
        from: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        to: now,
        bucket: '15m',
      };

    case 'today': {
      const from = startOfDay(now);
      const to = addDays(from, 1);
      return { from, to, bucket: '15m' };
    }

    case 'yesterday': {
      const today = startOfDay(now);
      const from = addDays(today, -1);
      const to = today;
      return { from, to, bucket: '15m' };
    }

    // ─────────────────────────────
    // Rolling days
    // ─────────────────────────────
    case '7d':
      return {
        from: addDays(now, -7),
        to: now,
        bucket: 'day',
      };

    case '30d':
      return {
        from: addDays(now, -30),
        to: now,
        bucket: 'day',
      };

    case '90d':
      return {
        from: addDays(now, -90),
        to: now,
        bucket: 'day',
      };

    case '365d':
      return {
        from: addDays(now, -365),
        to: now,
        bucket: 'day',
      };

    // ─────────────────────────────
    // Calendar periods
    // ─────────────────────────────
    case 'last_week': {
      const today = startOfDay(now);
      const day = today.getDay(); // 0=Sun
      const diffToMonday = (day + 6) % 7;
      const thisMonday = addDays(today, -diffToMonday);
      const from = addDays(thisMonday, -7);
      const to = thisMonday;
      return { from, to, bucket: 'day' };
    }

    case 'last_month': {
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const from = addMonths(thisMonthStart, -1);
      const to = thisMonthStart;
      return { from, to, bucket: 'day' };
    }

    case '12m': {
      const to = now;
      const from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      return { from, to, bucket: 'month' };
    }

    default:
      throw new Error(`Unknown preset: ${preset}`);
  }
}

export type OverviewArgs = {
  companyId: string;
  storeId: string | null;

  // ✅ base range for everything EXCEPT salesTimeseries
  from: Date;
  to: Date;

  // ✅ optional separate preset for sales chart only
  salesPreset?: Preset;

  topProductsLimit?: number;
  recentOrdersLimit?: number;
  paymentsLimit?: number;
  topProductsBy?: 'revenue' | 'units';
};
