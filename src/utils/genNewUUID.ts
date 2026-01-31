import { randomUUID } from "crypto";

export function genNewUUID(): string {
    return randomUUID();
}
