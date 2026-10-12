import { cookies } from "next/headers";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getOAuthClient } from "./client";
import type { OAuthSession } from "@atproto/oauth-client-node";

function secret() {
  const k = process.env.PRIVATE_KEY;
  if (!k) throw new Error("PRIVATE_KEY missing");
  return createHash("sha256").update("session-cookie:" + k).digest();
}

export function signDid(did: string): string {
  const sig = createHmac("sha256", secret()).update(did).digest("base64url");
  return `${did}.${sig}`;
}

function verifyDid(value: string | undefined): string | null {
  if (!value) return null;
  const i = value.lastIndexOf(".");
  if (i < 1) return null;
  const did = value.slice(0, i);
  const a = Buffer.from(value.slice(i + 1));
  const b = Buffer.from(createHmac("sha256", secret()).update(did).digest("base64url"));
  return a.length === b.length && timingSafeEqual(a, b) ? did : null;
}

export async function getDid(): Promise<string | null> {
  const store = await cookies();
  return verifyDid(store.get("did")?.value);
}

export async function getSession(): Promise<OAuthSession | null> {
  const did = await getDid();
  if (!did) return null;
  try {
    return await (await getOAuthClient()).restore(did);
  } catch {
    return null;
  }
}