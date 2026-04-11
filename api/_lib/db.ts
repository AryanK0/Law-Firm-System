import mysql, { type ResultSetHeader } from "mysql2/promise";

let pool: mysql.Pool | null = null;

function getPool() {
  if (pool) {
    return pool;
  }

  pool = mysql.createPool({
    host: process.env.DB_HOST ?? "localhost",
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "Ar@230806.",
    database: process.env.DB_NAME ?? "lawfirm",
    port: Number(process.env.DB_PORT ?? 3306),
    waitForConnections: true,
    connectionLimit: 5,
    decimalNumbers: true,
    dateStrings: true,
  });

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
