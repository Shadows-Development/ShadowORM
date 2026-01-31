// Repository.ts
import { getPool } from "./Database.js";
import { Model } from "./Model.js";
import { ResultSetHeader } from "mysql2";

export class Repository<T extends object> {
    constructor(public readonly model: Model<T>) {
        const pk = this.getPrimaryKeyField();
        if (!pk) {
            throw new Error(`Model "${model.name}" has no primary key defined (pk: true)`);
        }
    }

    /* ---------------------------------- */
    /* CREATE                              */
    /* ---------------------------------- */

    async create(data: T): Promise<T> {
        const keys = this.getInsertableKeys(data);
        if (keys.length === 0) throw new Error("create(): empty data");

        const sql = `
            INSERT INTO \`${this.model.name}\`
            (${keys.map(k => `\`${k}\``).join(",")})
            VALUES (${keys.map(() => "?").join(",")})
        `;

        const values = keys.map(k =>
            this.normalizeWriteValue(k as keyof T, (data as any)[k])
        );

        const [res] = await getPool().execute<ResultSetHeader>(sql, values);
        const pk = this.getPrimaryKeyField();

        if (pk && res.insertId) {
            return (await this.findById(res.insertId)) as T;
        }

        return data;
    }

    async createMany(rows: T[]): Promise<T[]> {
        if (rows.length === 0) return [];

        const keys = this.getInsertableKeys(rows[0]);
        if (keys.length === 0) throw new Error("createMany(): empty rows");

        const placeholders = rows
            .map(() => `(${keys.map(() => "?").join(",")})`)
            .join(",");

        const values = rows.flatMap(row =>
            keys.map(k =>
                this.normalizeWriteValue(k as keyof T, (row as any)[k])
            )
        );

        const sql = `
            INSERT INTO \`${this.model.name}\`
            (${keys.map(k => `\`${k}\``).join(",")})
            VALUES ${placeholders}
        `;

        const [res] = await getPool().execute<ResultSetHeader>(sql, values);
        const pk = this.getPrimaryKeyField();

        if (!pk || !res.insertId) return rows;

        const ids = rows.map((_, i) => res.insertId + i);
        return this.findManyByIds(ids as any);
    }

    async bulkInsert(rows: T[]): Promise<number> {
        if (rows.length === 0) return 0;

        const keys = this.getInsertableKeys(rows[0]);
        const placeholders = rows
            .map(() => `(${keys.map(() => "?").join(",")})`)
            .join(",");

        const values = rows.flatMap(row =>
            keys.map(k =>
                this.normalizeWriteValue(k as keyof T, (row as any)[k])
            )
        );

        const sql = `
            INSERT INTO \`${this.model.name}\`
            (${keys.map(k => `\`${k}\``).join(",")})
            VALUES ${placeholders}
        `;

        const [res] = await getPool().execute<ResultSetHeader>(sql, values);
        return res.affectedRows;
    }

    /* ---------------------------------- */
    /* READ                                */
    /* ---------------------------------- */

    async find(where: Partial<T> = {}): Promise<T[]> {
        const { sql, params } = this.buildWhereClause(where);
        const query = `SELECT * FROM \`${this.model.name}\` ${sql}`;
        const [rows] = await getPool().execute(query, params);
        return rows as T[];
    }

    async findOne(where: Partial<T>): Promise<T | null> {
        const { sql, params } = this.buildWhereClause(where);
        const query = `SELECT * FROM \`${this.model.name}\` ${sql} LIMIT 1`;
        const [rows] = await getPool().execute(query, params);
        return (rows as T[])[0] ?? null;
    }

    async count(where: Partial<T> = {}): Promise<number> {
        const { sql, params } = this.buildWhereClause(where);
        const query = `SELECT COUNT(*) as count FROM \`${this.model.name}\` ${sql}`;
        const [rows] = await getPool().execute(query, params);
        return (rows as any[])[0]?.count ?? 0;
    }

    async exists(where: Partial<T>): Promise<boolean> {
        return (await this.count(where)) > 0;
    }

    async findById(id: any): Promise<T | null> {
        const pk = this.getPrimaryKeyField();
        return this.findOne({ [pk as keyof T]: id } as Partial<T>);
    }

    async findManyByIds(ids: any[]): Promise<T[]> {
        if (ids.length === 0) return [];

        const pk = this.getPrimaryKeyField();
        const placeholders = ids.map(() => "?").join(",");

        const query = `
            SELECT * FROM \`${this.model.name}\`
            WHERE \`${String(pk)}\` IN (${placeholders})
        `;

        const [rows] = await getPool().execute(query, ids);
        return rows as T[];
    }

    /* ---------------------------------- */
    /* UPDATE                              */
    /* ---------------------------------- */

    async update(where: Partial<T>, data: Partial<T>): Promise<T | null> {
        if (!where || Object.keys(where).length === 0) {
            throw new Error("update(): missing WHERE");
        }

        const setKeys = Object.keys(data);
        if (setKeys.length === 0) return this.findOne(where);

        const setClause = setKeys.map(k => `\`${k}\` = ?`).join(", ");
        const setValues = setKeys.map(k =>
            this.normalizeWriteValue(k as keyof T, (data as any)[k])
        );

        const { sql: whereClause, params: whereValues } = this.buildWhereClause(where);

        const query = `
            UPDATE \`${this.model.name}\`
            SET ${setClause}
            ${whereClause}
        `;

        await getPool().execute(query, [...setValues, ...whereValues]);
        return this.findOne(where);
    }

    async updateMany(where: Partial<T>, data: Partial<T>): Promise<number> {
        if (!where || Object.keys(where).length === 0) {
            throw new Error("updateMany(): missing WHERE");
        }

        const setKeys = Object.keys(data);
        if (setKeys.length === 0) return 0;

        const setClause = setKeys.map(k => `\`${k}\` = ?`).join(", ");
        const setValues = setKeys.map(k =>
            this.normalizeWriteValue(k as keyof T, (data as any)[k])
        );

        const { sql, params } = this.buildWhereClause(where);

        const query = `
            UPDATE \`${this.model.name}\`
            SET ${setClause}
            ${sql}
        `;

        const [res] = await getPool().execute<ResultSetHeader>(query, [
            ...setValues,
            ...params,
        ]);

        return res.affectedRows;
    }

    /* ---------------------------------- */
    /* DELETE                              */
    /* ---------------------------------- */

    async delete(where: Partial<T>): Promise<void> {
        const { sql, params } = this.buildWhereClause(where);
        const query = `DELETE FROM \`${this.model.name}\` ${sql}`;
        await getPool().execute(query, params);
    }

    async deleteMany(where: Partial<T>): Promise<number> {
        const { sql, params } = this.buildWhereClause(where);
        const query = `DELETE FROM \`${this.model.name}\` ${sql}`;
        const [res] = await getPool().execute<ResultSetHeader>(query, params);
        return res.affectedRows;
    }

    /* ---------------------------------- */
    /* UPSERT                              */
    /* ---------------------------------- */

    async upsert(data: T): Promise<T> {
        const pk = this.getPrimaryKeyField();
        const pkField = this.model.normalizedSchema[pk as keyof T];

        if (pkField?.autoIncrement) {
            throw new Error("upsert() does not support auto-increment primary keys");
        }

        const keys = this.getInsertableKeys(data);
        const insertCols = keys.map(k => `\`${k}\``).join(",");
        const insertVals = keys.map(() => "?").join(",");

        const updateCols = keys
            .filter(k => k !== pk)
            .map(k => `\`${k}\` = VALUES(\`${k}\`)`)
            .join(",");

        const values = keys.map(k =>
            this.normalizeWriteValue(k as keyof T, (data as any)[k])
        );

        const sql = `
            INSERT INTO \`${this.model.name}\`
            (${insertCols})
            VALUES (${insertVals})
            ON DUPLICATE KEY UPDATE ${updateCols}
        `;

        await getPool().execute(sql, values);
        return (await this.findOne({ [pk as keyof T]: (data as any)[pk] } as Partial<T>))!;
    }

    /* ---------------------------------- */
    /* INTERNAL HELPERS                    */
    /* ---------------------------------- */

    private getInsertableKeys(data: object): string[] {
        return Object.keys(data).filter(key => {
            const field = this.model.normalizedSchema[key as keyof T];
            return !(field?.pk && field?.autoIncrement);
        });
    }

    private normalizeWriteValue(key: keyof T, value: any): any {
        const field = this.model.normalizedSchema[key];

        if (value == null) return null;

        if (field?.type === "datetime" && value instanceof Date) {
            return value.toISOString().slice(0, 19).replace("T", " ");
        }

        if (field?.type === "json") {
            return JSON.stringify(value);
        }

        return value;
    }

    private buildWhereClause(where: Partial<T>): { sql: string; params: any[] } {
        const keys = Object.keys(where);
        if (keys.length === 0) return { sql: "", params: [] };

        const conditions = keys.map(k => `\`${k}\` = ?`).join(" AND ");
        const values = keys.map(k => (where as any)[k]);

        return {
            sql: `WHERE ${conditions}`,
            params: values,
        };
    }

    private getPrimaryKeyField(): keyof T {
        return this.model.getPrimaryKey()!;
    }
}
