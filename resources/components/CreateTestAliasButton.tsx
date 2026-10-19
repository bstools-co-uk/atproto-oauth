"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateTestAliasButton() {
  const router = useRouter();
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/alias/test", { method: "POST" });
      const data = await res.json();
      setResult(res.ok ? `Created ${data.uri}` : `Error: ${data.error}`);
      if (res.ok) router.refresh();
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : "request failed"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={onClick}
        disabled={loading}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create test alias record"}
      </button>
      {result && <p className="text-sm break-all">{result}</p>}
    </div>
  );
}