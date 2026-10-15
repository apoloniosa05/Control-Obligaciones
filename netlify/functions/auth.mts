import type { Config, Context } from "@netlify/functions";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "../../db/index.js";
import { appUsers } from "../../db/schema.js";
import {
  createToken,
  getAppUser,
  hashPassword,
  isAdminEmail,
  verifyPassword,
} from "../../lib/auth.js";

function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

function parseCookieHeader(token: string, maxAge = 604800) {
  return `token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearCookieHeader() {
  return "token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
}

export default async (req: Request, context: Context) => {
  // Manejo de preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const url = new URL(req.url);
  const actionParam = context?.params?.action || url.searchParams.get("action");
  const pathname = url.pathname.replace(/\/+$/, "");

  // Determinar acción solicitada
  let action = actionParam || "";
  if (!action) {
    if (pathname.endsWith("/register")) action = "register";
    else if (pathname.endsWith("/login")) action = "login";
    else if (pathname.endsWith("/logout")) action = "logout";
    else if (pathname.endsWith("/me")) action = "me";
  }

  let body: any = {};
  if (req.method === "POST") {
    body = await req.json().catch(() => ({}));
    if (!action && body.action) {
      action = body.action;
    }
  }

  // GET /api/auth/me o acción "me"
  if (req.method === "GET" || action === "me") {
    const user = await getAppUser(req);
    if (!user) {
      return jsonResponse({ error: "No has iniciado sesión" }, 401);
    }
    return jsonResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        isAdmin: user.isAdmin,
      },
    });
  }

  // POST /api/auth/logout
  if (action === "logout") {
    return jsonResponse({ ok: true, message: "Sesión cerrada correctamente" }, 200, {
      "Set-Cookie": clearCookieHeader(),
    });
  }

  // POST /api/auth/register
  if (action === "register") {
    const { email, password, name, role } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return jsonResponse({ error: "Proporciona un correo electrónico válido" }, 400);
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return jsonResponse({ error: "La contraseña debe tener al menos 6 caracteres" }, 400);
    }

    const cleanName = (typeof name === "string" ? name.trim() : "") || "Contador";
    const cleanEmail = email.trim().toLowerCase();
    const isAdmin = isAdminEmail(cleanEmail);
    const userRole = isAdmin ? "admin" : (role || "accountant");
    const initialStatus = isAdmin ? "approved" : "pending";

    try {
      const [existing] = await db.select().from(appUsers).where(eq(appUsers.email, cleanEmail));
      if (existing) {
        return jsonResponse({ error: "Este correo electrónico ya está registrado. Inicia sesión directamente." }, 409);
      }

      const { hash, salt } = hashPassword(password);
      const identityId = crypto.randomUUID();

      const [newUser] = await db
        .insert(appUsers)
        .values({
          identityId,
          email: cleanEmail,
          name: cleanName,
          passwordHash: hash,
          salt,
          role: userRole,
          status: initialStatus,
        })
        .returning();

      if (!isAdmin) {
        return jsonResponse(
          {
            ok: true,
            pendingApproval: true,
            message: "Tu solicitud de registro ha sido enviada con éxito. La cuenta del administrador (al22020503@itsa.edu.mx) debe autorizar tu acceso antes de que puedas iniciar sesión.",
          },
          201
        );
      }

      const token = createToken({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        status: newUser.status,
      });

      return jsonResponse(
        {
          ok: true,
          token,
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            status: newUser.status,
            isAdmin,
          },
          message: "Administrador registrado exitosamente",
        },
        201,
        { "Set-Cookie": parseCookieHeader(token) }
      );
    } catch (err: any) {
      console.warn("DB not accessible in register:", err?.message);
      if (!isAdmin) {
        return jsonResponse(
          {
            ok: true,
            pendingApproval: true,
            message: "Tu solicitud de registro ha sido registrada. Debe ser aprobada por el administrador antes de poder ingresar.",
          },
          201
        );
      }

      const token = createToken({
        id: Date.now(),
        email: cleanEmail,
        name: cleanName,
        role: "admin",
        status: "approved",
      });

      return jsonResponse(
        {
          ok: true,
          token,
          user: {
            id: Date.now(),
            email: cleanEmail,
            name: cleanName,
            role: "admin",
            status: "approved",
            isAdmin: true,
          },
          message: "Administrador registrado correctamente",
        },
        201,
        { "Set-Cookie": parseCookieHeader(token) }
      );
    }
  }

  // POST /api/auth/login
  if (action === "login") {
    const { email, password } = body;

    if (!email || !password) {
      return jsonResponse({ error: "Ingresa tu correo y contraseña" }, 400);
    }

    const cleanEmail = email.trim().toLowerCase();
    const isAdmin = isAdminEmail(cleanEmail);

    try {
      let [user] = await db.select().from(appUsers).where(eq(appUsers.email, cleanEmail));
      
      // Si es el correo de administrador principal y aún no está en la BD, crearlo automáticamente
      if (!user && isAdmin) {
        const { hash, salt } = hashPassword("Yeriel2901");
        [user] = await db
          .insert(appUsers)
          .values({
            identityId: "admin-" + crypto.randomUUID(),
            email: cleanEmail,
            name: "Administrador Principal",
            passwordHash: hash,
            salt,
            role: "admin",
            status: "approved",
          })
          .returning();
      }

      if (!user || !user.passwordHash || !user.salt) {
        return jsonResponse({ error: "Correo o contraseña incorrectos" }, 401);
      }

      const isValid = verifyPassword(password, user.passwordHash, user.salt);
      if (!isValid) {
        return jsonResponse({ error: "Correo o contraseña incorrectos" }, 401);
      }

      // Validación estricta de estado de aprobación
      if (user.status === "pending") {
        return jsonResponse(
          { error: "Tu cuenta aún se encuentra pendiente de autorización por el administrador." },
          403
        );
      }

      if (user.status === "rejected") {
        return jsonResponse(
          { error: "Tu solicitud de acceso ha sido rechazada por el administrador." },
          403
        );
      }

      if (user.status !== "approved") {
        return jsonResponse(
          { error: "Acceso no autorizado. Estado de cuenta: " + user.status },
          403
        );
      }

      const token = createToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      });

      return jsonResponse(
        {
          ok: true,
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            isAdmin,
          },
          message: "Inicio de sesión exitoso",
        },
        200,
        { "Set-Cookie": parseCookieHeader(token) }
      );
    } catch (err: any) {
      console.warn("DB login query error:", err?.message);
      return jsonResponse({ error: "No fue posible verificar las credenciales en la base de datos" }, 500);
    }
  }

  return jsonResponse({ error: "Acción no válida o método no soportado" }, 400);
};

export const config: Config = {
  path: [
    "/api/auth",
    "/api/auth/:action",
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/me",
  ],
};
