import { Kysely } from "kysely";
import { Migration, Migrator } from "kysely/migration";
import { getDb } from ".";

const migrations: Record<string, Migration> = {
  "001": {
    async up(db: Kysely<unknown>) {
      await db.schema
        .createTable("auth_state")
        .addColumn("key", "text", (col) => col.primaryKey())
        .addColumn("value", "text", (col) => col.notNull())
        .execute();

      await db.schema
        .createTable("auth_session")
        .addColumn("key", "text", (col) => col.primaryKey())
        .addColumn("value", "text", (col) => col.notNull())
        .execute();
    },
    async down(db: Kysely<unknown>) {
      await db.schema.dropTable("auth_session").execute();
      await db.schema.dropTable("auth_state").execute();
    },
  },
  "002": {
    async up(db: Kysely<unknown>) {
      await db.schema
        .createTable("github_link")
        .addColumn("did", "text", (c) => c.primaryKey())
        .addColumn("github_id", "text", (c) => c.notNull())
        .addColumn("github_login", "text", (c) => c.notNull())
        .addColumn("verified_at", "text", (c) => c.notNull())
        .execute();
    },
    async down(db: Kysely<unknown>) {
      await db.schema.dropTable("github_link").execute();
    },
  },
    "003": {
    async up(db: Kysely<unknown>) {
      await db.schema
        .createTable("alias_record")
        .addColumn("alias_uri", "text", (c) => c.primaryKey())
        .addColumn("did", "text", (c) => c.notNull())
        .addColumn("alias_cid", "text", (c) => c.notNull())
        .addColumn("github_id", "text", (c) => c.notNull())
        .addColumn("attestation_uri", "text")
        .addColumn("created_at", "text", (c) => c.notNull())
        .execute();
    },
    async down(db: Kysely<unknown>) {
      await db.schema.dropTable("alias_record").execute();
    },
  },
};

export function getMigrator() {
  const db = getDb();
  return new Migrator({
    db,
    provider: {
      getMigrations: async () => migrations,
    },
  });
}
