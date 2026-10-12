import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getOAuthClient } from "@/lib/auth/client";
import { getDid } from "@/lib/auth/session";

export async function POST() {
  const cookieStore = await cookies();
  try {
    const did = await getDid();

    if (did) {
      const client = await getOAuthClient();
      await client.revoke(did);
    }
  } catch (error) {
    console.error("Logout error:", error);
  }

  cookieStore.delete("did");
  return NextResponse.json({ success: true });
}