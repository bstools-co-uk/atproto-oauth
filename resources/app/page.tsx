import { getSession } from "@/lib/auth/session";
import { getGithubLink } from "@/lib/github";
import { LoginForm } from "@/components/LoginForm";
import { LogoutButton } from "@/components/LogoutButton";
import { CreateTestAliasButton } from "@/components/CreateTestAliasButton";

const ERRORS: Record<string, string> = {
  login_failed: "Sign-in failed. Please try again.",
  github_state: "GitHub verification expired or was invalid. Please try again.",
  github_token: "GitHub did not return a token. Check the app credentials.",
  github_user: "Could not read your GitHub profile.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await getSession();
  const link = session ? await getGithubLink(session.did) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <main className="w-full max-w-md mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            AT Protocol OAuth
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Sign in with your AT Protocol account
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          {error && (
            <p className="text-red-500 text-sm mb-4">
              {ERRORS[error] ?? "Something went wrong."}
            </p>
          )}
          {session ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Signed in as{" "}
                  <span className="font-mono">{session.did}</span>
                </p>
                <LogoutButton />
              </div>

              {link ? (
                <p className="text-sm text-green-600">
                  GitHub verified:{" "}
                  <span className="font-mono">{link.github_login}</span>{" "}
                  (id {link.github_id}) ·{" "}
                  <a href="/github/login" className="underline">re-verify</a>
                </p>
              ) : (
                <a
                  href="/github/login"
                  className="block w-full text-center py-2 px-4 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Verify your GitHub account
                </a>
              )}

              {link && <CreateTestAliasButton />}
            </div>
          ) : (
            <LoginForm />
          )}
        </div>
      </main>
    </div>
  );
}