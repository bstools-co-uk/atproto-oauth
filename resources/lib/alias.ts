import { Agent } from "@atproto/api";
import type { OAuthSession } from "@atproto/oauth-client-node";
import { getDb } from "@/lib/db";
import { getGithubLink } from "@/lib/github";
import { getHostAgent } from "@/lib/host";
import { createHash } from "node:crypto";

// keep in sync with api/alias/test
const ALIAS_NSID = "uk.co.bstools.alias.test.link";
const ATTEST_NSID = "uk.co.bstools.alias.test.attestation";
const HOST_DID = process.env.HOST_DID ?? "did:plc:tka3pdbs3wapp4asr7nfj7w2";

const isNotFound = (err: unknown) =>
  (err as { error?: string }).error === "RecordNotFound";

export function attestRkey(did: string, service: string, identifier: string) {
  return createHash("sha256")
    .update(`${did}|${service}|${identifier}`)
    .digest("hex")
    .slice(0, 32);
}

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

  // 1. The user's own link record must still exist in their repo.
  try {
    await new Agent(session).com.atproto.repo.getRecord({
      repo: did,
      collection: ALIAS_NSID,
      rkey: row.alias_uri.split("/").pop()!,
    });
  } catch (err) {
    if (isNotFound(err)) {
      await db.deleteFrom("alias_record").where("alias_uri", "=", row.alias_uri).execute();
      return accredited;
    }
    console.error("alias record check failed:", err);
  }

  // 2. The host's attestation record must still exist in the host repo.
  try {
    const host = await getHostAgent();
    if (host.did !== HOST_DID) throw new Error("host account DID mismatch");
    await host.com.atproto.repo.getRecord({
      repo: HOST_DID,
      collection: ATTEST_NSID,
      rkey: row.attestation_uri!.split("/").pop()!,
    });
  } catch (err) {
    if (isNotFound(err)) {
      // Keep the link record; clear the attestation so the button can re-attest.
      await db
        .updateTable("alias_record")
        .set({ attestation_uri: null })
        .where("alias_uri", "=", row.alias_uri)
        .execute();
      return accredited;
    }
    console.error("attestation check failed:", err);
  }

  accredited.add("github");
  return accredited;
}