export interface BaseSchema {
    id?: string;
    data?: any;
    createdAt?: Date;
}

/* ---------------------------------- */
/* Field definitions                   */
/* ---------------------------------- */

export type SimpleFieldType = "string" | "int" | "float" | "boolean" | "json" | "datetime";

export interface FieldOptions {
    type: SimpleFieldType;

    pk?: boolean;
    autoIncrement?: boolean;

    required?: boolean;
    unique?: boolean;

    default?: any;
}

export interface IndexDefinition {
    name?: string;                // optional, auto-generated if missing
    columns: string[];             // ["email"], ["userId", "createdAt"]
    unique?: boolean;
}


export type SchemaValue = SimpleFieldType | FieldOptions;
export type NormalizedField = FieldOptions;

/* ---------------------------------- */
/* Foreign keys                        */
/* ---------------------------------- */

export interface ForeignKeyDefinition {
    column: string;
    references: {
        table: string;
        column: string;
    };
    onDelete?: "CASCADE" | "SET NULL" | "RESTRICT";
    onUpdate?: "CASCADE" | "RESTRICT";
}

/* ---------------------------------- */
/* Model                               */
/* ---------------------------------- */



export class Model<T extends Partial<BaseSchema> = BaseSchema> {
    public readonly normalizedSchema: Record<keyof T, NormalizedField>;

    constructor(
        public readonly name: string,
        schema: Record<keyof T, SchemaValue>,
        public readonly foreignKeys: ForeignKeyDefinition[] = [],
        public readonly indexes: IndexDefinition[] = []
    ) {
        this.normalizedSchema = this.normalizeSchema(schema);
    }

    private normalizeSchema(
        schema: Record<keyof T, SchemaValue>
    ): Record<keyof T, NormalizedField> {
        const normalized = {} as Record<keyof T, NormalizedField>;

        for (const key of Object.keys(schema) as (keyof T)[]) {
            const value = schema[key];

            if (typeof value === "string") {
                normalized[key] = {
                    type: value,
                };
            } else {
                normalized[key] = {
                    required: false,
                // @ts-expect-error wierd generic errors
                    ...value,
                };
            }
        }

        return normalized;
    }

    getPrimaryKey(): keyof T | undefined {
        for (const key of Object.keys(this.normalizedSchema) as (keyof T)[]) {
            if (this.normalizedSchema[key].pk) return key;
        }
        return undefined;
    }
}
