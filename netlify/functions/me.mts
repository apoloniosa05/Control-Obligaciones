import type { Config, Context } from "@netlify/functions";
import { getAppUser, unauthorized } from "../../lib/auth.js";

export default async (req: Request, context: Context) => {
  const user = await getAppUser(req);
  if (!user) return unauthorized();
  return Response.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    isAdmin: user.isAdmin,
  });
};

export const config: Config = { path: "/api/me" };
