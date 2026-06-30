import { createClient } from "../../utils/supabase/server";

export default async function TestPage() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getSession();

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="rounded-2xl border p-8 shadow-lg">
        <h1 className="text-2xl font-bold">Test Supabase</h1>

        <p className="mt-4">
          {data.session
            ? "✅ Un utilisateur est connecté."
            : "✅ Connexion à Supabase réussie (aucun utilisateur connecté)."}
        </p>
      </div>
    </main>
  );
}