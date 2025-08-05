import {getAllModels, getPool} from '../core'

function normalizeField(value: string | { type: string; pk?: boolean; default?: any; required?: boolean }) {
    if (typeof value === "string") return { type: value };
    return value;
}

function formatDefault(value: any): string {
    if (typeof value === "string") return `'${value}'`;
    if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
    if (value === null || value === undefined) return "NULL";
    return value.toString();
}

function mapType(type: string): string {
    switch (type.toLowerCase()) {
        case "string": return "VARCHAR(255)";
        case "json": return "JSON";
        case "datetime": return "DATETIME";
        case "number": return "INT";
        case "float": return "FLOAT";
        case "boolean": return "BOOLEAN";
        default: return type;
    }
}

export async function syncSchema() {
    const models = getAllModels();
    const pool = getPool();

    for (const [name, model] of models.entries()) {
        const columns: string[] = [];

        for (const [key, value] of Object.entries(model.schema)) {
            const { type, pk, default: def, required } = normalizeField(value);
            let col = `\`${key}\` ${mapType(type)}`;
            if (required || pk) col += " NOT NULL";
            if (pk) col += " PRIMARY KEY";
            if (def !== undefined) col += ` DEFAULT ${formatDefault(def)}`;
            columns.push(col);
        }

        const fks = model.foreignKeys.map(
            fk => `FOREIGN KEY (\`${fk.column}\`) REFERENCES ${fk.reference}`
        );

        const sql = `CREATE TABLE IF NOT EXISTS \`${name}\` (\n  ${[...columns, ...fks].join(',\n  ')}\n);`;
        await pool.execute(sql);
    }

    console.log("✅ Schema synchronized.");
}