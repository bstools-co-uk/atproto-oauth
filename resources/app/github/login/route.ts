import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getDid } from "@/lib/auth/session";

const BASE = process.env.PUBLIC_URL || "http://127.0.0.1:3065";

export async function GET() {
  if (!(await getDid())) return NextResponse.redirect(new URL("/", BASE));
  const state = randomBytes(24).toString("base64url");
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID!);
  url.searchParams.set("redirect_uri", `${BASE}/github/callback`);
  url.searchParams.set("state", state);
  const res = NextResponse.redirect(url);
  res.cookies.set("gh_state", state, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}