import { NextRequest, NextResponse } from "next/server";
import { getDid } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

const BASE = process.env.PUBLIC_URL || "http://127.0.0.1:3065";
const fail = (why: string) =>
  NextResponse.redirect(new URL(`/?error=${why}`, BASE));

export async function GET(req: NextRequest) {
  const did = await getDid();
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expected = req.cookies.get("gh_state")?.value;
  if (!did || !code || !state || state !== expected) return fail("github_state");

  const tok = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${BASE}/github/callback`,
    }),
  }).then((r) => r.json());
  if (!tok.access_token) return fail("github_token");

  const user = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tok.access_token}`,
      Accept: "application/vnd.github+json",
    },
  }).then((r) => r.json());
  if (!user.id) return fail("github_user");

  const row = {
    did,
    github_id: String(user.id),
    github_login: String(user.login),
    verified_at: new Date().toISOString(),
  };
  await getDb()
    .insertInto("github_link")
    .values(row)
    .onConflict((oc) =>
      oc.column("did").doUpdateSet({
        github_id: row.github_id,
        github_login: row.github_login,
        verified_at: row.verified_at,
      }))
    .execute();

  const res = NextResponse.redirect(new URL("/", BASE));
  res.cookies.delete("gh_state");
  return res;
}