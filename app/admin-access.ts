import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "./chatgpt-auth";

// Identity comes from the trusted Sites gateway or a validated server session.
// No default administrator and no role supplied by the browser is trusted.
export function isAdmin(user: ChatGPTUser | null): boolean {
  const email = (env as unknown as { SHABASHKA_ADMIN_EMAIL?: string }).SHABASHKA_ADMIN_EMAIL;
  return !!user && user.emailVerified === true && !!email?.trim() && user.email.toLowerCase() === email.trim().toLowerCase();
}

export function marketDatabase() {
  return (env as unknown as { DB: D1Database }).DB;
}

export async function blocked(owner: string): Promise<boolean> {
  return !!await marketDatabase().prepare("SELECT id FROM records WHERE id=? AND kind='block'").bind("block:" + owner).first();
}

export async function unavailable(id: string): Promise<boolean> {
  return !!await marketDatabase().prepare("SELECT r.id FROM records r WHERE r.id=? AND (EXISTS (SELECT 1 FROM records m WHERE m.id='hidden:'||r.id AND m.kind='hidden') OR EXISTS (SELECT 1 FROM records b WHERE b.id='block:'||r.owner AND b.kind='block') OR EXISTS(SELECT 1 FROM records a WHERE a.id='account:'||r.owner AND json_extract(a.data,'$.inactive')=1))").bind(id).first();
}
