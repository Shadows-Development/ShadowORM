// syncSchema.ts
import fs from "fs";
import path from "path";
import { getAllModels, getPool } from "../core/Database.js";
import { Model } from "../core/Model.js";

/* ---------------------------------- */
/* Helpers                            */
/* ---------------------------------- */

function mapType(type: string): string {
    switch (type) {
        case "string": return "VARCHAR(255)";
        case "json": return "JSON";
        case "datetime": return "DATETIME";
        case "int": return "INT";
        case "float": return "FLOAT";
        case "boolean": return "BOOLEAN";
        default: return type;
    }
}

function formatDefault(value: any): string {
    if (typeof value === "string") return `'${value}'`;
    if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
    if (value == null) return "NULL";
    return value.toString();
}

/* ---------------------------------- */
/* DB Introspection                   */
/* ---------------------------------- */

async function getExistingTables(): Promise<Set<string>> {
    const pool = getPool();
    const [rows] = await pool.query<any[]>("SHOW TABLES");
    // @ts-expect-error wierd generic errors
    return new Set(Object.values(rows[0] ?? {}).length ? rows.map(r => Object.values(r)[0]) : []);
}

/* ---------------------------------- */
/* Migration Generator                */
/* ---------------------------------- */

export async function syncSchema(options?: {
    generate?: boolean;
    apply?: boolean;
    migrationsPath?: string;
}) {
    const generate = options?.generate ?? true;
    const apply = options?.apply ?? false;
    const migrationsPath = options?.migrationsPath ?? "./migrations";

    if (process.env.NODE_ENV === "production" && apply) {
        throw new Error("syncSchema(): cannot apply schema changes in production");
    }

    const models = getAllModels();
    const pool = getPool();
    const existingTables = await getExistingTables();

    const statements: string[] = [];

    for (const [tableName, model] of models.entries()) {
        if (existingTables.has(tableName)) continue;

        statements.push(generateCreateTableSQL(model));
        statements.push(...generateIndexSQL(model));
    }

    if (statements.length === 0) {
        console.log("✅ Schema already in sync.");
        return;
    }

    if (generate) {
        emitMigration(statements, migrationsPath);
    }

    if (apply) {
        for (const sql of statements) {
            await pool.execute(sql);
        }
        console.log("✅ Schema applied (dev mode).");
    }
}

/* ---------------------------------- */
/* SQL Builders                       */
/* ---------------------------------- */

function generateCreateTableSQL(model: Model<any>): string {
    const columns: string[] = [];

    for (const [key, field] of Object.entries(model.normalizedSchema)) {
        let col = `\`${key}\` ${mapType(field.type)}`;

        if (field.pk) col += " PRIMARY KEY";
        if (field.autoIncrement) col += " AUTO_INCREMENT";
        if (field.required || field.pk) col += " NOT NULL";
        if (field.default !== undefined) col += ` DEFAULT ${formatDefault(field.default)}`;

        columns.push(col);
    }

    const fks = model.foreignKeys.map(fk => {
        let sql =
            `FOREIGN KEY (\`${fk.column}\`) ` +
            `REFERENCES \`${fk.references.table}\`(\`${fk.references.column}\`)`;

        if (fk.onDelete) {
            sql += ` ON DELETE ${fk.onDelete}`;
        }

        if (fk.onUpdate) {
            sql += ` ON UPDATE ${fk.onUpdate}`;
        }

        return sql;
    });


    return `
CREATE TABLE \`${model.name}\` (
  ${[...columns, ...fks].join(",\n  ")}
);`.trim();
}

function generateIndexSQL(model: Model<any>): string[] {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return model.indexes.map((idx, i) => {
        const name =
            idx.name ??
            `idx_${model.name}_${idx.columns.join("_")}`;

        const unique = idx.unique ? "UNIQUE " : "";
        const cols = idx.columns.map(c => `\`${c}\``).join(", ");

        return `CREATE ${unique}INDEX \`${name}\` ON \`${model.name}\` (${cols});`;
    });
}


/* ---------------------------------- */
/* Migration Writer                   */
/* ---------------------------------- */

function emitMigration(sql: string[], dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const id = new Date()
        .toISOString()
        .replace(/[-:T.Z]/g, "")
        .slice(0, 14);

    const filename = `${id}_auto_sync.ts`;
    const filePath = path.join(dir, filename);

    const content = `
import type { Migration } from "@shadow-dev/orm";

export const migration: Migration = {
  id: "${id}",
  name: "auto_sync",

  async up(db) {
${sql
        .map(
            s =>
                `    await db.exec(\`${s.replace(/`/g, "\\`")}\`);`
        )
        .join("\n")}
  }
};
`.trim();

    fs.writeFileSync(filePath, content, { encoding: "utf8" });
    console.log(`📝 Migration generated: ${filePath}`);
}
