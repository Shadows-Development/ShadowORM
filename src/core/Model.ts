export interface BaseSchema {
    id?: string;
    data?: any;
    createdAt?: Date;
}

export interface ForeignKeyDefinition {
    column: string;
    reference: string;
}
export type SimpleFieldType = "string" | "int" | "float" | "boolean" | "json" | "datetime";

export interface FieldOptions {
    type: SimpleFieldType;
    pk?: boolean;
    required?: boolean;
    default?: any;
}

export type SchemaValue = SimpleFieldType | FieldOptions;
export type FlexibleSchema<T> = Record<keyof T, SchemaValue>;

export class Model<T extends Partial<BaseSchema> = BaseSchema> {
    constructor(
        public readonly name: string,
        public readonly schema: FlexibleSchema<T>,
        public readonly foreignKeys: ForeignKeyDefinition[] = []
    ) {}
}
