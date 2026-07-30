import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export type SessionUser = {
  id: number;
  name: string;
  role: "sales" | "follow_up" | "commission" | "admin";
  store: string;
};

const COOKIE_NAME = "mobileconnect_session";
const secret = process.env.SESSION_SECRET || process.env.DB_PASSWORD || "development-only-change-me";

function signature(payload: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionToken(user: SessionUser) {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + 1000 * 60 * 60 * 12 })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [payload, supplied] = token.split(".");
  if (!payload || !supplied) return null;
  const expected = signature(payload);
  if (supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return null;
  try {
    const user = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!user.id || !user.name || !user.role || !user.store || user.exp < Date.now()) return null;
    return { id: user.id, name: user.name, role: user.role, store: user.store };
  } catch {
    return null;
  }
}

export const sessionCookie = (value: string) => ({
  name: COOKIE_NAME,
  value,
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 12,
});

export const clearSessionCookie = { ...sessionCookie(""), maxAge: 0 };
