import { getPool } from "../core/Database.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";


export async function getNextId(prefix: string): Promise<string> {
    const pool = getPool();

    // Ensure table exists (safe to call multiple times)
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS _id_counters (
                                                    prefix VARCHAR(255) PRIMARY KEY,
            count INT NOT NULL
            )
    `);

    // Atomic upsert + increment
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [result] = await pool.execute<ResultSetHeader>(
        `
            INSERT INTO _id_counters (prefix, count)
            VALUES (?, 1)
                ON DUPLICATE KEY UPDATE count = count + 1
        `,
        [prefix]
    );

    // Fetch the new value
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT count FROM _id_counters WHERE prefix = ?`,
        [prefix]
    );
    const count = (rows[0] as { count: number }).count;

    return `${prefix}-${String(count).padStart(3, "0")}`;
}
