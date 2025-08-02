export interface BaseSchema {
    id: string;
    data?: any;
    createdAt: Date;
}

export interface ForeignKeyDefinition {
    column: string;
    reference: string;
}

export class Model<T extends Partial<BaseSchema> = BaseSchema> {
    constructor(
        public readonly name: string,
        public readonly schema: Record<keyof T, string>,
        public readonly foreignKeys: ForeignKeyDefinition[] = []
    ) {}
}
