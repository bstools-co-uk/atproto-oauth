import { getDb } from "@/lib/db";

export async function getGithubLink(did: string) {
  const row = await getDb()
    .selectFrom("github_link")
    .selectAll()
    .where("did", "=", did)
    .executeTakeFirst();
  return row ?? null;
}