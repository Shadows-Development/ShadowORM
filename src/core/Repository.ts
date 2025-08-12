// Repository.ts
import { getPool } from "./Database";
import { Model } from "./Model";
import {ResultSetHeader} from "mysql2";

export class Repository<T extends object> {
    constructor(public readonly model: Model<T>) {
        // Validate PK at construction
        const pk = this.getPrimaryKeyField();
        if (!pk) {
            throw new Error(`Model "${model.name}" has no primary key defined (pk: true)`);
        }
    }

    async create(data: T): Promise<T> {
        const keys = Object.keys(data);
        if (keys.length === 0) throw new Error("create(): empty data");

        const sql = `INSERT INTO \`${this.model.name}\` (${keys.map(k => `\`${k}\``).join(",")})
                     VALUES (${keys.map(() => "?").join(",")})`;
        const values = keys.map((key) => this.normalizeValue((data as any)[key]));

        const [res] = await getPool().execute<ResultSetHeader>(sql, values);

        const pk = this.getPrimaryKeyField();

        // If PK exists in data, refetch using it
        if (pk && (data as any)[pk] != null) {
            const row = await this.findOne({ [pk]: (data as any)[pk] } as Partial<T>);
            if (row) return row;
        }

        // If PK is auto-increment and insertId is present
        if (pk && res.insertId && res.insertId !== 0) {
            const row = await this.findOne({ [pk]: res.insertId as any } as Partial<T>);
            if (row) return row;
        }

        // Fallback — return data + insertId if available
        if (res.insertId && res.insertId !== 0) {
            return { ...(data as any), id: res.insertId } as T;
        }

        return data;
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

    async update(where: Partial<T>, data: Partial<T>): Promise<T | null> {
        if (!where || Object.keys(where).length === 0) {
            throw new Error("update(): missing WHERE");
        }

        const setKeys = Object.keys(data);
        if (setKeys.length === 0) return this.findOne(where);

        const setClause = setKeys.map(k => `\`${k}\` = ?`).join(", ");
        const setValues = setKeys.map(k => this.normalizeValue((data as any)[k]));

        const { sql: whereClause, params: whereValues } = this.buildWhereClause(where);
        const query = `UPDATE \`${this.model.name}\` SET ${setClause} ${whereClause}`;
        await getPool().execute(query, [...setValues, ...whereValues.map(this.normalizeValue)]);

        return this.findOne(where);
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
    private getPrimaryKeyField(): keyof T | undefined {
        for (const key of Object.keys(this.model.schema) as (keyof T)[]) {
            if ((this.model.schema as any)[key]?.pk) {
                return key;
            }
        }
        return undefined;
    }
}
