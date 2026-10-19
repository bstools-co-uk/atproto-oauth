import { Agent } from "@atproto/api";
import { getSession } from "@/lib/auth/session";
import { getGithubLink } from "@/lib/github";
import { getAccreditedServices } from "@/lib/alias";
import { SERVICES } from "@/lib/services";
import { ServiceIcon } from "@/components/ServiceIcon";
import { LogoutButton } from "@/components/LogoutButton";
import { CreateTestAliasButton } from "@/components/CreateTestAliasButton";

const ERRORS: Record<string, string> = {
  login_failed: "Sign-in failed. Please try again.",
  github_state: "GitHub verification expired or was invalid. Please try again.",
  github_token: "GitHub did not return a token. Check the app credentials.",
  github_user: "Could not read your GitHub profile.",
};

const publicAgent = new Agent("https://public.api.bsky.app");

async function getProfile(did: string) {
  try {
    const res = await publicAgent.getProfile({ actor: did });
    return res.data;
  } catch (err) {
    console.error("getProfile failed:", err);
    return null;
  }
}

// async function getProfile(session: NonNullable<Awaited<ReturnType<typeof getSession>>>) {
//   try {
//     const res = await new Agent(session).getProfile({ actor: session.did });
//     return res.data;
//   } catch {
//     return null;
//   }
// }

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await getSession();

  const [profile, accredited, ghLink] = session
    ? await Promise.all([
        getProfile(session.did),
        getAccreditedServices(session.did),
        getGithubLink(session.did),
      ])
    : [null, new Set<string>(), null];

  const needsAlias = !!session && !!ghLink && !accredited.has("github");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="flex items-center justify-between p-4">
        {session ? (
          <details className="relative">
            <summary className="list-none cursor-pointer">
              {profile?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar}
                  alt={profile.handle}
                  className="h-10 w-10 rounded-full object-cover border border-zinc-300 dark:border-zinc-700"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center text-sm font-medium">
                  {(profile?.handle ?? "?").charAt(0).toUpperCase()}
                </div>
              )}
            </summary>
            <div className="absolute left-0 mt-2 w-64 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-lg space-y-2 z-10">
              {profile?.displayName && (
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{profile.displayName}</p>
              )}
              <p className="text-sm text-zinc-600 dark:text-zinc-400">@{profile?.handle ?? session.did}</p>
              <p className="text-xs font-mono text-zinc-500 break-all">{session.did}</p>
              <LogoutButton />
            </div>
          </details>
        ) : (
          <a
            href="/login"
            className="py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Log in
          </a>
        )}
      </header>

      <main className="mx-auto max-w-3xl p-8">
        {error && (
          <p className="text-red-500 text-sm mb-4 text-center">
            {ERRORS[error] ?? "Something went wrong."}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8">
          {SERVICES.map((s) => {
            const isAccredited = accredited.has(s.id);
            return (
              <a
                key={s.id}
                href={session ? s.href : "/login"}
                className="group flex flex-col items-center gap-2"
              >
                <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800">
                  <ServiceIcon id={s.id} />
                  {isAccredited && (
                    <span
                      title="Accredited record"
                      aria-label="Accredited record"
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-green-500 ring-2 ring-zinc-50 dark:ring-zinc-950"
                    />
                  )}
                </div>
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{s.name}</span>
              </a>
            );
          })}
        </div>

        {needsAlias && (
          <div className="mt-12 flex flex-col items-center gap-2">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              GitHub is verified but has no accredited alias record yet.
            </p>
            <CreateTestAliasButton />
          </div>
        )}
      </main>
    </div>
  );
}