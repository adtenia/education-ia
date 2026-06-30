export default function StartPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-4xl font-bold text-slate-950">
          Commencer avec Education IA
        </h1>

        <p className="mt-6 text-lg text-slate-600">
          Cette page servira bientôt à créer un compte et choisir une formule.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-5">
            <h2 className="text-xl font-bold text-slate-900">Standard</h2>
            <p className="mt-2 text-slate-600">
              Pour commencer à apprendre avec Education IA.
            </p>
          </div>

          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5">
            <h2 className="text-xl font-bold text-purple-800">Premium</h2>
            <p className="mt-2 text-slate-600">
              Pour profiter plus tard de toutes les fonctionnalités avancées.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}