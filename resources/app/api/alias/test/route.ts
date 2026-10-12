import { NextResponse } from "next/server";
import { Agent } from "@atproto/api";
import { getSession } from "@/lib/auth/session";

const ALIAS_NSID = "uk.co.bstools.alias.test.link";
const HOST_DID = process.env.HOST_DID ?? "did:plc:tka3pdbs3wapp4asr7nfj7w2";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const agent = new Agent(session);
  try {
    const res = await agent.com.atproto.repo.createRecord({
      repo: session.did,
      collection: ALIAS_NSID,
      // validate: true, - rejected by PDS' that doesn't know alias lexicon
      record: {
        $type: ALIAS_NSID,
        service: "github",
        identifier: "test-0",
        authoriser: HOST_DID,
        createdAt: new Date().toISOString(),
      },
    });
    return NextResponse.json({ uri: res.data.uri, cid: res.data.cid });
  } catch (err) {
    const message = err instanceof Error ? err.message : "create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}