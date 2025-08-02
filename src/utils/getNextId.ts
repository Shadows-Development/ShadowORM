import { getPool } from "../core";

export async function getNextId(prefix: string): Promise<string> {
    const pool = getPool();

    await pool.execute(`
    CREATE TABLE IF NOT EXISTS _id_counters (
      prefix VARCHAR(255) PRIMARY KEY,
      count INT NOT NULL
    )
  `);

    const [rows] = await pool.query(`SELECT count FROM _id_counters WHERE prefix = ?`, [prefix]);
    let count = 1;

    if ((rows as any[]).length > 0) {
        count = (rows as any)[0].count + 1;
        await pool.execute(`UPDATE _id_counters SET count = ? WHERE prefix = ?`, [count, prefix]);
    } else {
        await pool.execute(`INSERT INTO _id_counters (prefix, count) VALUES (?, ?)`, [prefix, count]);
    }

    return `${prefix}-${String(count).padStart(3, "0")}`;
}
