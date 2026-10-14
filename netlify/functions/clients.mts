import type { Config } from "@netlify/functions";
import { asc, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { clients } from "../../db/schema.js";
import { forbidden, getAppUser, unauthorized } from "../../lib/auth.js";

type UpsertItem = { id: string; data: Record<string, unknown>; position?: number };

export default async (req: Request) => {
  const user = await getAppUser(req);
  if (!user) return unauthorized();
  if (user.status !== "approved") return forbidden();

  try {
    if (req.method === "GET") {
      const rows = await db.select().from(clients).orderBy(asc(clients.position), asc(clients.updatedAt));
      return Response.json(rows.map((r) => r.data));
    }

    // Sincroniza cambios: { upsert: [{ id, data, position }], remove: [id] }
    if (req.method === "PUT") {
      const body = (await req.json().catch(() => null)) as { upsert?: UpsertItem[]; remove?: string[] } | null;
      if (!body) return Response.json({ error: "Cuerpo inválido" }, { status: 400 });

      const upsert = (body.upsert || []).filter((c) => c && typeof c.id === "string" && c.data && typeof c.data === "object");
      const remove = (body.remove || []).filter((id) => typeof id === "string");

      if (upsert.length) {
        await db
          .insert(clients)
          .values(upsert.map((c) => ({ id: c.id, data: { ...c.data, id: c.id }, position: c.position ?? 0, updatedBy: user.email })))
          .onConflictDoUpdate({
            target: clients.id,
            set: {
              data: sql`excluded.data`,
              position: sql`excluded.position`,
              updatedBy: sql`excluded.updated_by`,
              updatedAt: sql`now()`,
            },
          });
      }
      if (remove.length) {
        await db.delete(clients).where(inArray(clients.id, remove));
      }
      return Response.json({ ok: true });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (err: any) {
    return Response.json({ error: "Error en base de datos", details: err?.message }, { status: 500 });
  }
};

export const config: Config = { path: "/api/clients" };
