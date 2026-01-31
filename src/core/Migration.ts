export interface Migration {
    id: string;
    name: string;

    up(db: MigrationContext): Promise<void> | void;

    down?: (db: MigrationContext) => Promise<void> | void;
}

export interface MigrationContext {
    exec(sql: string, params?: any[]): Promise<any>;
    query<T = any>(sql: string, params?: any[]): Promise<T>;
}