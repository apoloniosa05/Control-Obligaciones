import { getUser } from "@netlify/identity";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "../db/index.js";
import { appUsers } from "../db/schema.js";

const DEFAULT_ADMIN_EMAIL = "al22020503@itsa.edu.mx";
const JWT_SECRET = process.env.JWT_SECRET || process.env.TOKEN_SECRET || "mach-fiscal-control-secret-key-2026-secure";

export function isAdminEmail(email: string): boolean {
  if (!email) return false;
  const admin = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
  return email.trim().toLowerCase() === admin;
}

export type AppUser = typeof appUsers.$inferSelect & { isAdmin: boolean };

// Genera un hash criptográfico seguro para la contraseña usando scrypt nativo
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

// Verifica la contraseña contra el hash y la sal almacenados
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const testHash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(testHash, "hex"));
  } catch {
    return false;
  }
}

// Crea un token JWT seguro firmado con HMAC-SHA256
export function createToken(payload: object, expiresInSec = 86400 * 7): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSec })
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

// Verifica y decodifica el token JWT
export function verifyToken<T = any>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload as T;
  } catch {
    return null;
  }
}

// Extrae el token desde los headers (Authorization Bearer o Cookie token=)
export function extractToken(req?: Request): string | null {
  if (!req) return null;
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

// Obtiene el usuario autenticado actual desde el token propio o desde Netlify Identity
export async function getAppUser(req?: Request): Promise<AppUser | null> {
  // 1. Intentar validar token propio (Bearer o Cookie)
  const token = extractToken(req);
  if (token) {
    const decoded = verifyToken<{ id?: number; email: string; name?: string; role?: string; status?: string }>(token);
    if (decoded?.email) {
      const email = decoded.email.toLowerCase().trim();
      const isAdmin = isAdminEmail(email);

      try {
        let [row] = await db.select().from(appUsers).where(eq(appUsers.email, email));
        if (row) {
          if (isAdmin && row.status !== "approved") {
            [row] = await db.update(appUsers).set({ status: "approved" }).where(eq(appUsers.id, row.id)).returning();
          }
          return { ...row, isAdmin };
        }
      } catch (err) {
        // En caso de que la BD no esté disponible, usar información del token decodificado
        return {
          id: decoded.id ?? 1,
          identityId: "jwt-" + email,
          email,
          name: decoded.name ?? null,
          passwordHash: null,
          salt: null,
          role: decoded.role ?? (isAdmin ? "admin" : "accountant"),
          status: isAdmin ? "approved" : (decoded.status ?? "approved"),
          createdAt: new Date(),
          reviewedAt: null,
          isAdmin,
        };
      }
    }
  }

  // 2. Intentar validar sesión con Netlify Identity (si está configurado)
  try {
    const user = await getUser();
    if (user?.email) {
      const email = user.email.toLowerCase();
      const isAdmin = isAdminEmail(email);
      const name = (user.name || (user.userMetadata?.full_name as string | undefined) || null) ?? null;

      try {
        let [row] = await db.select().from(appUsers).where(eq(appUsers.identityId, user.id));
        if (!row) {
          [row] = await db
            .insert(appUsers)
            .values({ identityId: user.id, email, name, status: "approved", role: isAdmin ? "admin" : "accountant" })
            .onConflictDoUpdate({ target: appUsers.email, set: { identityId: user.id, name } })
            .returning();
        }

        if (isAdmin && row.status !== "approved") {
          [row] = await db.update(appUsers).set({ status: "approved" }).where(eq(appUsers.id, row.id)).returning();
        }

        return { ...row, isAdmin };
      } catch {
        return {
          id: 1,
          identityId: user.id,
          email,
          name,
          passwordHash: null,
          salt: null,
          role: isAdmin ? "admin" : "accountant",
          status: "approved",
          createdAt: new Date(),
          reviewedAt: null,
          isAdmin,
        };
      }
    }
  } catch {
    // Netlify Identity no configurado o no disponible en este entorno
  }

  return null;
}

export const unauthorized = (msg = "No has iniciado sesión") =>
  Response.json({ error: msg }, { status: 401 });

export const forbidden = (msg = "Tu cuenta aún no ha sido aprobada") =>
  Response.json({ error: msg }, { status: 403 });
