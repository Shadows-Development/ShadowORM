// Database.ts
import mysql from "mysql2/promise";
import { Model } from "./Model";

let pool: mysql.Pool;
const modelRegistry = new Map<string, Model<any>>();

export function initDatabase(config: mysql.PoolOptions) {
    pool = mysql.createPool(config);
}

export function getPool() {
    if (!pool) throw new Error("Database not initialized");
    return pool;
}

// @ts-expect-error wierd generic errors
export function registerModel<T>(model: Model<T>) {
    modelRegistry.set(model.name, model);
}

export function getAllModels() {
    return modelRegistry;
}
