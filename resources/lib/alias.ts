import { getDb } from "@/lib/db";
import { getGithubLink } from "@/lib/github";

// Returns the set of service ids for which this DID holds an attested alias record.
export async function getAccreditedServices(did: string): Promise<Set<string>> {
  const accredited = new Set<string>();

  const link = await getGithubLink(did);
  if (link) {
    const row = await getDb()
      .selectFrom("alias_record")
      .select("alias_uri")
      .where("did", "=", did)
      .where("github_id", "=", link.github_id)
      .where("attestation_uri", "is not", null)
      .executeTakeFirst();
    if (row) accredited.add("github");
  }
  return accredited;
}