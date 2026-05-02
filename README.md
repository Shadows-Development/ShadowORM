# ShadowORM

> 🧩 Lightweight, type-safe MySQL ORM for ShadowCore projects.  
> ShadowORM is built for **modularity**, **control**, and **runtime schema management** — ideal for bots, services, and web apps.

![npm version](https://img.shields.io/npm/v/@shadow-dev/orm?style=flat-square)
![license](https://img.shields.io/github/license/Shadows-Development/ShadowORM?style=flat-square)

---

## 📘 Overview

ShadowORM is a minimalist ORM focused on **explicit schemas and runtime safety** — without decorators, reflection, or heavy abstractions.

### Key Features

- ✔ **Type-safe models** using generics
- ✔ **Runtime schema sync (lightweight migrations)**
- ✔ **Rich field types (text, numeric, binary, datetime, JSON, UUID)**
- ✔ **Indexes & unique constraints**
- ✔ **Foreign key relationships with cascade rules**
- ✔ **JSON + Date normalization**
- ✔ **No decorators, no reflection, no magic**

It integrates cleanly with ShadowCore, but works standalone in any Node.js + TypeScript project.

---

## 📦 Installation

```bash
npm install @shadow-dev/orm mysql2
```

---

## 🧠 Usage Example

```ts
import {
  Model,
  Repository,
  initDatabase,
  registerModel,
  syncSchema
} from "@shadow-dev/orm";

const Ticket = new Model<{
  id: string;
  type: "support" | "report";
  data: { message: string };
  createdAt: Date;
}>("tickets", {
  id: { type: "uuid", pk: true },
  type: { type: "string", required: true },
  data: { type: "json" },
  createdAt: { type: "datetime", default: () => new Date() }
});

initDatabase({
  host: "localhost",
  user: "root",
  password: "password",
  database: "mydb"
});

registerModel(Ticket);

// Applies schema changes (tables, columns, indexes, FKs)
await syncSchema();

const tickets = new Repository(Ticket);

await tickets.create({
  id: crypto.randomUUID(),
  type: "support",
  data: { message: "Help me!" },
  createdAt: new Date()
});
```

---

## 🧱 Schema System

### Field Types

ShadowORM supports a wide range of SQL types:

| Category   | Types |
|------------|------|
| Strings    | `string`, `text`, `mediumtext`, `longtext` |
| Numbers    | `int`, `bigint`, `float`, `double`, `decimal` |
| Boolean    | `boolean` |
| Dates      | `date`, `time`, `datetime`, `timestamp` |
| JSON       | `json` |
| Binary     | `binary`, `varbinary` |
| Misc       | `uuid` |

---

### Field Options

```ts
{
  type: "string",
  pk?: boolean,
  autoIncrement?: boolean,
  required?: boolean,
  unique?: boolean,
  default?: any
}
```

---

### Indexes

```ts
indexes: [
  {
    columns: ["email"],
    unique: true
  },
  {
    columns: ["userId", "createdAt"]
  }
]
```

---

### Foreign Keys

```ts
foreignKeys: [
  {
    column: "userId",
    references: {
      table: "users",
      column: "id"
    },
    onDelete: "CASCADE",
    onUpdate: "CASCADE"
  }
]
```

---

## 🔄 Schema Sync (Lightweight Migrations)

ShadowORM includes a **runtime schema sync system** that:

- Creates missing tables
- Adds new columns
- Applies indexes
- Applies foreign keys

This acts as a **lightweight migration system** — without requiring migration files or CLI tooling.

> ⚠️ Destructive changes (like dropping columns) are intentionally not automatic.

---

## 🛣 Roadmap

- [x] CRUD repository
- [x] Relational schema support
- [x] Runtime schema sync (light migrations)
- [x] Index support
- [x] Foreign key constraints
- [ ] CLI (optional)
- [ ] Full migration system (optional)
- [ ] PostgreSQL support (planned)

---

## 📚 Documentation

📖 Docs coming soon:  
➡️ https://docs.shadowdevelopment.net

---

## 🏢 Project Ownership

ShadowORM is developed and maintained under Shadow Development LLC.  
➡️ https://shadowdevelopment.net

---

## 📄 License

Licensed under the **GNU General Public License v3.0**  
See the [LICENSE](LICENSE) file for details.
