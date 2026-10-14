import { AtpAgent } from "@atproto/api";

const HOST_PDS = process.env.HOST_PDS ?? "https://pds.eurosky.social";
let pending: Promise<AtpAgent> | null = null;

export function getHostAgent(): Promise<AtpAgent> {
  if (!pending) {
    pending = (async () => {
      const agent = new AtpAgent({ service: HOST_PDS });
      await agent.login({
        identifier: process.env.HOST_HANDLE!,
        password: process.env.HOST_APP_PASSWORD!,
      });
      return agent;
    })().catch((e) => {
      pending = null;
      throw e;
    });
  }
  return pending;
}