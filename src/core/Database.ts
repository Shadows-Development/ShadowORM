// Database.ts
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { Model } from "./Model.js";
import { Migration } from "./Migration.js";

let pool: mysql.Pool;
const modelRegistry = new Map<string, Model<any>>();

let migrationsPath: string | null = null;
let autoMigrate = false;

/* ---------------------------------- */
/* Initialization                      */

/* ---------------------------------- */

export async function initDatabase(config: mysql.PoolOptions, options?: {
    migrations?: {
        path: string;
        auto?: boolean;
    }
}) {
    pool = mysql.createPool(config);

    if(options?.migrations) {
        migrationsPath = options.migrations.path;
        autoMigrate = options.migrations.auto ?? false;
    }

    if (autoMigrate && migrationsPath) {
        await runMigrations(migrationsPath);
    }
}

export function getPool() {
    if(!pool) throw new Error("Database not initialized");
    return pool;
}

/* ---------------------------------- */
/* Models                              */
/* ---------------------------------- */

// @ts-expect-error wierd generic errors
export function registerModel<T>(model: Model<T>) {
    modelRegistry.set(model.name, model);
}

export function getAllModels() {
    return modelRegistry;
}

/* ---------------------------------- */
/* Low-level helpers                   */
/* ---------------------------------- */
export async function exec(sql: string, params?: any[]) {
    const [result] = await getPool().execute(sql, params);
    return result;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
    const [rows] = await getPool().query(sql, params);
    return rows as T;
}

export async function transaction<T>(
    fn: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
    const conn = await getPool().getConnection();
    try {
        await conn.beginTransaction();
        const result = await fn(conn);
        await conn.commit();
        return result;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

/* ---------------------------------- */
/* Migrations                          */
/* ---------------------------------- */
async function ensureMigrationTable() {
    await exec(`
    CREATE TABLE IF NOT EXISTS shadoworm_migrations (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function loadMigrations(dir: string): Promise<Migration[]> {
    if (!fs.existsSync(dir)) return [];

    const files = fs
        .readdirSync(dir)
        .filter(f => f.endsWith(".js") || f.endsWith(".ts"));

    const migrations: Migration[] = [];

    for (const file of files) {
        const fullPath = path.resolve(dir, file);
        const fileUrl = pathToFileURL(fullPath).href;

        const mod = await import(fileUrl);

        if (!mod.migration) {
            throw new Error(`Migration ${file} does not export 'migration'`);
        }

        migrations.push(mod.migration as Migration);
    }

    return migrations.sort((a, b) => a.id.localeCompare(b.id));
}

export async function runMigrations(dir: string) {
    await ensureMigrationTable();

    const applied = await query<{ id: string }[]>(
        `SELECT id FROM shadoworm_migrations`
    );
    const appliedIds = new Set(applied.map(m => m.id));

    const migrations = await loadMigrations(dir);

    for (const migration of migrations) {
        if (appliedIds.has(migration.id)) continue;

        await transaction(async conn => {
            await migration.up({
                exec: (sql: string, params?: any[]) =>
                    conn.execute(sql, params),
                query: <T = any>(sql: string, params?: any[]) =>
                    conn.query(sql, params).then(([rows]) => rows as T)
            } as any);

            await conn.execute(
                `INSERT INTO shadoworm_migrations (id, name) VALUES (?, ?)`,
                [migration.id, migration.name]
            );
        });
    }
}