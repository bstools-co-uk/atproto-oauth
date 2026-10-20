import { NextResponse } from "next/server";
import { Agent } from "@atproto/api";
import { getSession } from "@/lib/auth/session";
import { getGithubLink } from "@/lib/github";
import { getHostAgent } from "@/lib/host";
import { getDb } from "@/lib/db";
import { attestRkey } from "@/lib/alias";

const ALIAS_NSID = "uk.co.bstools.alias.test.link";
const ATTEST_NSID = "uk.co.bstools.alias.test.attestation";
const HOST_DID = process.env.HOST_DID ?? "did:plc:tka3pdbs3wapp4asr7nfj7w2";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  const link = await getGithubLink(session.did);
  if (!link) {
    return NextResponse.json({ error: "verify GitHub first" }, { status: 409 });
  }

  const db = getDb();
  const agent = new Agent(session);

  try {
    let row = await db.selectFrom("alias_record").selectAll()
      .where("did", "=", session.did)
      .where("github_id", "=", link.github_id)
      .executeTakeFirst();

    // Drop stale rows whose record was deleted from the user's repo
    if (row) {
      try {
        await agent.com.atproto.repo.getRecord({
          repo: session.did,
          collection: ALIAS_NSID,
          rkey: row.alias_uri.split("/").pop()!,
        });
      } catch {
        await db.deleteFrom("alias_record").where("alias_uri", "=", row.alias_uri).execute();
        row = undefined;
      }
    }

    if (!row) {
      const created = await agent.com.atproto.repo.createRecord({
        repo: session.did,
        collection: ALIAS_NSID,
        record: {
          $type: ALIAS_NSID,
          service: "github",
          identifier: link.github_id,
          authoriser: HOST_DID,
          createdAt: new Date().toISOString(),
        },
      });
      row = {
        alias_uri: created.data.uri,
        did: session.did,
        alias_cid: created.data.cid,
        github_id: link.github_id,
        attestation_uri: null,
        created_at: new Date().toISOString(),
      };
      await db.insertInto("alias_record").values(row).execute();
    }

    // Attest if missing, or if an old random-rkey attestation needs migrating
    const rkey = attestRkey(session.did, "github", link.github_id);
    if (!row.attestation_uri || !row.attestation_uri.endsWith(`/${rkey}`)) {
      try {
        const host = await getHostAgent();
        if (host.did !== HOST_DID) throw new Error("host account DID mismatch");
        const att = await host.com.atproto.repo.putRecord({
          repo: HOST_DID,
          collection: ATTEST_NSID,
          rkey,
          record: {
            $type: ATTEST_NSID,
            subject: { uri: row.alias_uri, cid: row.alias_cid },
            did: session.did,
            method: "oauth",
            createdAt: new Date().toISOString(),
          },
        });
        row.attestation_uri = att.data.uri;
        await db.updateTable("alias_record")
          .set({ attestation_uri: att.data.uri })
          .where("alias_uri", "=", row.alias_uri)
          .execute();
      } catch (err) {
        console.error("Attestation failed:", err);
        return NextResponse.json(
          { error: "alias created but attestation failed; press again to retry", uri: row.alias_uri },
          { status: 502 },
        );
      }
    }

    return NextResponse.json({
      uri: row.alias_uri,
      cid: row.alias_cid,
      attestation: row.attestation_uri,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}