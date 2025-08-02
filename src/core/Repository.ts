// Repository.ts
import { getPool } from "./Database";
import { Model } from "./Model";

export class Repository<T extends object> {
    constructor(public readonly model: Model<T>) {}

    async create(data: T): Promise<void> {
        const keys = Object.keys(data);
        const sql = `INSERT INTO \`${this.model.name}\` (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`;
        const values = keys.map((key) => this.normalizeValue((data as any)[key]));

        await getPool().execute(sql, values);
    }


    async find(where: Partial<T> = {}): Promise<T[]> {
        const { sql, params } = this.buildWhereClause(where);
        const query = `SELECT * FROM \`${this.model.name}\` ${sql}`;
        const [rows] = await getPool().execute(query, params.map(this.normalizeValue));
        return rows as T[];
    }

    async findOne(where: Partial<T>): Promise<T | null> {
        const { sql, params } = this.buildWhereClause(where);
        const query = `SELECT * FROM \`${this.model.name}\` ${sql} LIMIT 1`;
        const [rows] = await getPool().execute(query, params.map(this.normalizeValue));
        const results = rows as T[];
        return results.length > 0 ? results[0] : null;
    }

    async update(where: Partial<T>, data: Partial<T>): Promise<void> {
        const setKeys = Object.keys(data);
        const setClause = setKeys.map(k => `${k} = ?`).join(", ");
        const setValues = setKeys.map(k => this.normalizeValue((data as any)[k]));

        const { sql: whereClause, params: whereValues } = this.buildWhereClause(where);
        const query = `UPDATE \`${this.model.name}\` SET ${setClause} ${whereClause}`;
        await getPool().execute(query, [...setValues, ...whereValues.map(this.normalizeValue)]);
    }

    async delete(where: Partial<T>): Promise<void> {
        const { sql, params } = this.buildWhereClause(where);
        const query = `DELETE FROM \`${this.model.name}\` ${sql}`;
        await getPool().execute(query, params.map(this.normalizeValue));
    }

    async count(where: Partial<T> = {}): Promise<number> {
        const { sql, params } = this.buildWhereClause(where);
        const query = `SELECT COUNT(*) as count FROM \`${this.model.name}\` ${sql}`;
        const [rows] = await getPool().execute(query, params.map(this.normalizeValue));
        return (rows as any[])[0].count || 0;
    }

    async exists(where: Partial<T>): Promise<boolean> {
        const count = await this.count(where);
        return count > 0;
    }

    private normalizeValue(value: any): any {
        if (value instanceof Date) {
            return value.toISOString().slice(0, 19).replace("T", " ");
        }
        if (typeof value === "object" && value !== null) {
            return JSON.stringify(value);
        }
        return value ?? null;
    }

    private buildWhereClause(where: Partial<T>): { sql: string; params: any[] } {
        const keys = Object.keys(where);
        if (keys.length === 0) return { sql: "", params: [] };

        const conditions = keys.map(k => `${k} = ?`).join(" AND ");
        const values = keys.map(k => (where as any)[k]);
        return {
            sql: `WHERE ${conditions}`,
            params: values,
        };
    }
}
