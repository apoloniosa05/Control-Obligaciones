import type { Config, Context } from "@netlify/functions";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appUsers } from "../../db/schema.js";
import { ensureAdminAccount, forbidden, getAppUser, isAdminEmail, unauthorized } from "../../lib/auth.js";

const STATUSES = ["pending", "approved", "rejected"];

export default async (req: Request, context: Context) => {
  const user = await getAppUser(req);
  if (!user) return unauthorized();
  if (!user.isAdmin) return forbidden("Solo el administrador principal puede gestionar usuarios");

  try {
    // Garantizar que la cuenta de administrador exista
    await ensureAdminAccount();

    if (req.method === "GET") {
      const rows = await db
        .select()
        .from(appUsers)
        .orderBy(
          sql`CASE WHEN ${appUsers.status} = 'pending' THEN 0 ELSE 1 END`,
          desc(appUsers.createdAt)
        );

      return Response.json(
        rows.map((r) => ({
          id: r.id,
          email: r.email,
          name: r.name,
          role: r.role,
          status: r.status,
          createdAt: r.createdAt,
          reviewedAt: r.reviewedAt,
          isAdmin: isAdminEmail(r.email),
        }))
      );
    }

    if (req.method === "PATCH") {
      const id = Number(context.params.id);
      const { status } = (await req.json().catch(() => ({}))) as { status?: string };
      if (!id || !status || !STATUSES.includes(status)) {
        return Response.json({ error: "Solicitud o estado inválido" }, { status: 400 });
      }
      const [target] = await db.select().from(appUsers).where(eq(appUsers.id, id));
      if (!target) return Response.json({ error: "Usuario no encontrado" }, { status: 404 });
      if (isAdminEmail(target.email)) return Response.json({ error: "No puedes modificar al administrador" }, { status: 400 });

      const [updated] = await db
        .update(appUsers)
        .set({ status, reviewedAt: new Date() })
        .where(eq(appUsers.id, id))
        .returning();
      return Response.json({
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        status: updated.status,
        createdAt: updated.createdAt,
        reviewedAt: updated.reviewedAt,
        isAdmin: isAdminEmail(updated.email),
      });
    }

    if (req.method === "DELETE") {
      const id = Number(context.params.id);
      if (!id) return Response.json({ error: "ID de usuario inválido" }, { status: 400 });

      const [target] = await db.select().from(appUsers).where(eq(appUsers.id, id));
      if (!target) return Response.json({ error: "Usuario no encontrado" }, { status: 404 });
      if (isAdminEmail(target.email)) return Response.json({ error: "No puedes eliminar al administrador principal" }, { status: 400 });

      await db.delete(appUsers).where(eq(appUsers.id, id));
      return Response.json({ ok: true, message: "Usuario eliminado correctamente" });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (err: any) {
    return Response.json({ error: "Error en base de datos", details: err?.message }, { status: 500 });
  }
};

export const config: Config = { path: ["/api/users", "/api/users/:id"] };
