import { Agent } from "@atproto/api";
import type { OAuthSession } from "@atproto/oauth-client-node";
import { getDb } from "@/lib/db";
import { getGithubLink } from "@/lib/github";

const ALIAS_NSID = "uk.co.bstools.alias.test.link"; // keep in sync with api/alias/test

export async function getAccreditedServices(session: OAuthSession): Promise<Set<string>> {
  const accredited = new Set<string>();
  const did = session.did;

  const link = await getGithubLink(did);
  if (!link) return accredited;

  const db = getDb();
  const row = await db
    .selectFrom("alias_record")
    .selectAll()
    .where("did", "=", did)
    .where("github_id", "=", link.github_id)
    .where("attestation_uri", "is not", null)
    .executeTakeFirst();
  if (!row) return accredited;

  try {
    await new Agent(session).com.atproto.repo.getRecord({
      repo: did,
      collection: ALIAS_NSID,
      rkey: row.alias_uri.split("/").pop()!,
    });
    accredited.add("github");
  } catch (err) {
    if ((err as { error?: string }).error === "RecordNotFound") {
      await db.deleteFrom("alias_record").where("alias_uri", "=", row.alias_uri).execute();
    } else {
      console.error("alias record check failed:", err);
      accredited.add("github");
    }
  }
  return accredited;
}