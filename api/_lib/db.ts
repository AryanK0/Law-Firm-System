import mysql, { type PoolOptions, type ResultSetHeader } from "mysql2/promise";

let pool: mysql.Pool | null = null;

function envFlag(name: string) {
  const v = process.env[name]?.toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function buildPoolOptions(): PoolOptions {
  const useSsl = envFlag("DB_SSL");
  const connectTimeout = Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 15_000);
  if (!Number.isFinite(connectTimeout) || connectTimeout < 1) {
    throw new Error("Invalid DB_CONNECT_TIMEOUT_MS.");
  }

  return {
    host: process.env.DB_HOST ?? "127.0.0.1",
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "lawfirm",
    port: Number(process.env.DB_PORT ?? 3306),
    waitForConnections: true,
    connectionLimit: (() => {
      const n = Number(process.env.DB_POOL_SIZE ?? 5);
      return Number.isFinite(n) && n >= 1 ? Math.min(20, n) : 5;
    })(),
    decimalNumbers: true,
    dateStrings: true,
    connectTimeout,
    enableKeepAlive: true,
    ssl: useSsl
      ? {
          rejectUnauthorized: !envFlag("DB_SSL_INSECURE"),
        }
      : undefined,
  };
}

function getPool() {
  if (pool) {
    return pool;
  }

  pool = mysql.createPool(buildPoolOptions());

  return pool;
}

export async function queryRows<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
) {
  const [rows] = await getPool().query(sql, params);
  return rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
) {
  const rows = await queryRows<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params: unknown[] = []) {
  const [result] = await getPool().execute<ResultSetHeader>(sql, params as any[]);
  return result;
}

export async function callProcedureOne<T extends Record<string, unknown>>(
  name: string,
  params: unknown[] = [],
) {
  const placeholders =
    params.length > 0 ? params.map(() => "?").join(", ") : "";
  const [result] = await getPool().query(
    `CALL ${name}(${placeholders})`,
    params,
  );

  if (Array.isArray(result)) {
    for (const item of result) {
      if (Array.isArray(item) && item.length > 0) {
        return item[0] as T;
      }
    }

    if (result.length > 0 && !Array.isArray(result[0])) {
      return result[0] as T;
    }
  }

  return null;
}
