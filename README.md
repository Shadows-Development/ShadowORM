# ShadowORM

> ≡ƒº⌐ Lightweight, type-safe MySQL ORM for ShadowCore projects.  
> ShadowORM is built for **modularity**, **security**, and **runtime schema sync** ΓÇö perfect for bots, services, or web apps using ShadowCore.

![npm version](https://img.shields.io/npm/v/@shadow-dev/orm?style=flat-square)
![license](https://img.shields.io/github/license/Shadows-Development/ShadowORM?style=flat-square)

---

## ≡ƒöì Overview

ShadowORM is a minimalist ORM that offers:

- Γ£à **Type-safe models** using generics
- Γ£à **Automatic schema synchronization** (no migration needed)
- Γ£à **JSON + Date normalization**
- Γ£à **Relational support** with foreign keys
- Γ£à **No decorators, no reflection, no magic**

ItΓÇÖs designed to work cleanly alongside ShadowCore but can also be used standalone in any Node.js TypeScript project.

---

## ≡ƒôª Installation

```bash
npm install @shadow-dev/orm mysql2
```

---

## ≡ƒ¢á Usage Example

```ts
import { Model, Repository, initDatabase, registerModel } from "@shadow-dev/orm";

const Ticket = new Model<{
  id: string;
  type: "support" | "report";
  data: { message: string };
  createdAt: Date;
}>("tickets", {
  id: "string",
  type: "string",
  data: "json",
  createdAt: "datetime"
});

initDatabase({
  host: "localhost",
  user: "root",
  password: "password",
  database: "mydb"
});

registerModel(Ticket);

// Auto-create table on startup
await syncSchema();

const tickets = new Repository(Ticket);


// Use it
await tickets.create({
  id: "ticket-001",
  type: "support",
  data: { message: "Help me!" },
  createdAt: new Date()
});
```

---

## ≡ƒºá Schema Types

ShadowORM supports:

| Type                      | SQL Equivalent    |
|---------------------------|-------------------|
| `string`                  | `VARCHAR(255)`    |
| `number`                  | `INT`             |
| `boolean`                 | `BOOLEAN`         |
| `json`                    | `LONGTEXT`        |
| `datetime`                | `DATETIME`        |
| `FOREIGN_KEY:<tbl.col>`   | Foreign key ref   |

---

## ≡ƒº▒ Roadmap

- [x] CRUD repository
- [x] Relational schema support
- [x] Automatic schema sync
- [ ] CLI (optional)
- [ ] Migrations (optional)
- [ ] Postgres support (maybe)

---

## ≡ƒôû Documentation

≡ƒôÜ Docs are coming soon and will be available on the ShadowCore documentation site:  
Γ₧í∩╕Å [docs.shadowdevelopment.net](https://docs.shadowdevelopment.net)

---

## ≡ƒÅó Project Ownership

ShadowORM is officially developed and maintained under [Shadow Development LLC](https://shadowdevelopment.net).

---

## ≡ƒô£ License

Licensed under the **GNU General Public License v3.0**  
See the [LICENSE](LICENSE) file for details.
