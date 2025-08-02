import {getAllModels, getPool} from '../core'

export async function syncSchema() {
    const models = getAllModels();
    const pool = getPool();

    for (const [name, model] of models.entries()) {
        const columns: string[] = [];
        const foreignKeys: string[] = [];

        for (const [key, type] of Object.entries(model.schema)) {
            columns.push(`\`${key}\` ${mapType(type)}`);
        }

        for (const fk of model.foreignKeys) {
            foreignKeys.push(`FOREIGN KEY (\`${fk.column}\`) REFERENCES ${fk.reference}`);
        }

        const columnDefs = [...columns, ...foreignKeys].join(",\n  ");
        const sql = `CREATE TABLE IF NOT EXISTS \`${name}\` (\n  ${columnDefs}\n);`;

        await pool.execute(sql);
    }

    console.log("Γ£à Schema synchronized.");
}

function mapType(type: string): string {
    switch (type.toLowerCase()) {
        case "string": return "VARCHAR(255)";
        case "json": return "JSON";
        case "datetime": return "DATETIME";
        case "number": return "INT";
        case "boolean": return "BOOLEAN";
        default: return type; // fallback for raw SQL types if provided
    }
}
