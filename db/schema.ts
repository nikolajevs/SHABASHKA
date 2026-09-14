import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
export const records = sqliteTable(
  "records",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    owner: text("owner").notNull(),
    parent: text("parent"),
    data: text("data").notNull(),
    created: text("created").notNull(),
  },
  (t) => [
    index("records_kind").on(t.kind),
    index("records_owner").on(t.owner),
    index("records_parent").on(t.parent),
  ],
);
