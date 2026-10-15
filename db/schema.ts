import { pgTable, serial, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

// Usuarios de la app y su estado de aprobación (pending | approved | rejected)
export const appUsers = pgTable("app_users", {
  id: serial().primaryKey(),
  identityId: text("identity_id").notNull().unique(),
  email: text().notNull().unique(),
  name: text(),
  passwordHash: text("password_hash"),
  salt: text("salt"),
  role: text("role").default("accountant"),
  status: text().notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
});

// Padrón de clientes compartido; cada fila guarda el objeto completo del cliente
export const clients = pgTable("clients", {
  id: text().primaryKey(),
  data: jsonb().notNull(),
  position: integer().notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by"),
});
