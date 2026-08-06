type JsonObject = Record<string, unknown>;

function objects(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is JsonObject => Boolean(item) && typeof item === "object") : [];
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function SectionHeading({ number, eyebrow, title, color }: { number: string; eyebrow: string; title: string; color: string }) {
  return (
    <header className="mb-7 flex items-start gap-4 border-b border-slate-200 pb-5">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white ${color}`}>{number}</span>
      <div><p className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">{eyebrow}</p><h4 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{title}</h4></div>
    </header>
  );
}

function DotList({ items, dot = "bg-slate-500" }: { items: string[]; dot?: string }) {
  return <ul className="space-y-3">{items.map((item, index) => <li key={index} className="flex gap-3 text-base leading-7"><span className={`mt-[0.65rem] h-2 w-2 shrink-0 rounded-full ${dot}`} /><span className="min-w-0 break-words">{item}</span></li>)}</ul>;
}

const challengeNames: Record<string, string> = {
  true_false: "Vrai ou faux",
  fill_blank: "Complète la phrase",
  find_error: "Trouve l’erreur",
  matching: "Relie les éléments",
  chronology: "Remets dans l’ordre",
  riddle: "Petite énigme",
};

export default function RevisionNotebookContent({ data }: { data: JsonObject }) {
  const introduction = data.introduction && typeof data.introduction === "object" ? data.introduction as JsonObject : {};
  const lessons = objects(data.lesson_sections);
  const notions = objects(data.essential_notions);
  const definitions = objects(data.definitions);
  const examples = objects(data.explained_examples);
  const exercises = objects(data.exercises);
  const challenges = objects(data.mini_challenges);
  const mistakes = objects(data.common_mistakes);
  const tips = strings(data.tips);
  const mustRemember = strings(data.must_remember);
  const quickReview = strings(data.two_minute_review);

  return (
    <div className="revision-notebook mx-auto max-w-5xl text-slate-700">
      <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-700 via-indigo-700 to-slate-900 px-6 py-9 text-white shadow-xl shadow-violet-200/60 sm:px-10 sm:py-12">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <p className="relative text-sm font-black uppercase tracking-[0.2em] text-violet-100">Carnet de révision</p>
        <h3 className="relative mt-3 max-w-4xl text-3xl font-black tracking-tight sm:text-4xl">{text(data.title) || "Mon carnet de révision"}</h3>
        {text(introduction.overview) && <p className="relative mt-5 max-w-3xl text-lg leading-8 text-violet-50">{text(introduction.overview)}</p>}
      </header>

      <section className="mt-12">
        <SectionHeading number="1" eyebrow="Pour commencer" title="Découvrir le chapitre" color="bg-violet-600" />
        <div className="grid gap-5 lg:grid-cols-2">
          {strings(introduction.learning_goals).length > 0 && <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-6"><h5 className="text-lg font-black text-violet-900">Ce que tu vas apprendre</h5><div className="mt-4 text-violet-950"><DotList items={strings(introduction.learning_goals)} dot="bg-violet-500" /></div></div>}
          {(text(introduction.importance) || strings(introduction.uses).length > 0) && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6"><h5 className="text-lg font-black text-slate-950">Pourquoi c’est utile</h5>{text(introduction.importance) && <p className="mt-3 text-base leading-7">{text(introduction.importance)}</p>}{strings(introduction.uses).length > 0 && <div className="mt-4"><DotList items={strings(introduction.uses)} dot="bg-slate-500" /></div>}</div>}
        </div>
      </section>

      <section className="mt-14">
        <SectionHeading number="2" eyebrow="La leçon" title="Comprendre pas à pas" color="bg-slate-900" />
        <div className="space-y-9">{lessons.map((lesson, index) => <article key={index} className="border-l-2 border-slate-200 pl-5 sm:pl-7"><h5 className="text-xl font-black text-slate-950">{text(lesson.title)}</h5><div className="mt-4 max-w-4xl space-y-5">{strings(lesson.paragraphs).map((paragraph, paragraphIndex) => <p key={paragraphIndex} className="text-base leading-8 sm:text-lg">{paragraph}</p>)}</div></article>)}</div>
      </section>

      <section className="mt-14">
        <SectionHeading number="3" eyebrow="Les bases" title="À connaître absolument" color="bg-amber-500" />
        <div className="grid gap-4 md:grid-cols-2">{notions.map((notion, index) => <article key={index} className="rounded-2xl border border-amber-300 border-l-4 border-l-amber-500 bg-amber-50/70 p-5"><h5 className="text-lg font-black text-amber-950">{text(notion.title)}</h5><p className="mt-3 text-base leading-7 text-slate-800">{text(notion.explanation)}</p>{text(notion.example) && <p className="mt-4 border-t border-amber-200 pt-3 text-sm leading-6 text-amber-900"><strong>Exemple :</strong> {text(notion.example)}</p>}</article>)}</div>
      </section>

      {definitions.length > 0 && <section className="mt-14"><SectionHeading number="4" eyebrow="Le vocabulaire" title="Définitions" color="bg-red-600" /><div className="grid gap-4 md:grid-cols-2">{definitions.map((definition, index) => <article key={index} className="rounded-2xl border border-red-300 border-l-4 border-l-red-600 bg-red-50 p-5 text-red-950"><h5 className="text-lg font-black text-red-800">{text(definition.term)}</h5><p className="mt-3 text-base leading-7">{text(definition.definition)}</p></article>)}</div></section>}

      {examples.length > 0 && <section className="mt-14"><SectionHeading number="5" eyebrow="En pratique" title="Exemples expliqués" color="bg-blue-600" /><div className="space-y-5">{examples.map((example, index) => <article key={index} className="rounded-2xl border border-blue-300 bg-blue-50/60 p-6"><h5 className="text-xl font-black text-blue-900">{text(example.title)}</h5><p className="mt-3 text-base leading-7 text-blue-950">{text(example.situation)}</p>{strings(example.steps).length > 0 && <ol className="mt-5 space-y-3">{strings(example.steps).map((step, stepIndex) => <li key={stepIndex} className="flex gap-3 text-base leading-7"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white">{stepIndex + 1}</span><span>{step}</span></li>)}</ol>}<p className="mt-5 border-t border-blue-200 pt-4 text-base leading-7"><strong className="text-blue-800">Pourquoi :</strong> {text(example.why)}</p></article>)}</div></section>}

      {exercises.length > 0 && <section className="mt-14"><SectionHeading number="6" eyebrow="À toi de jouer" title="Exercices progressifs" color="bg-violet-600" /><div className="space-y-4">{exercises.map((exercise, index) => { const level = Math.min(3, Math.max(1, Number(exercise.level) || 1)); return <article key={index} className="rounded-2xl border border-violet-300 bg-violet-50/60 p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h5 className="text-lg font-black text-violet-950">{text(exercise.title)}</h5><span className="rounded-full bg-violet-200 px-3 py-1 text-sm font-black text-violet-800">Niveau {level} · {"●".repeat(level)}{"○".repeat(3 - level)}</span></div><p className="mt-4 text-base leading-7 text-slate-800">{text(exercise.instruction)}</p>{text(exercise.hint) && <p className="mt-4 text-sm leading-6 text-violet-800"><strong>Indice :</strong> {text(exercise.hint)}</p>}<details className="mt-5 rounded-xl border border-violet-200 bg-white"><summary className="cursor-pointer px-4 py-3 font-black text-violet-800">Voir la correction</summary><p className="border-t border-violet-100 px-4 py-4 text-base leading-7">{text(exercise.correction)}</p></details></article>; })}</div></section>}

      {challenges.length > 0 && <section className="mt-14"><SectionHeading number="7" eyebrow="Pour varier" title="Mini défis" color="bg-orange-500" /><div className="grid gap-4 md:grid-cols-2">{challenges.map((challenge, index) => <article key={index} className="rounded-2xl border border-orange-300 bg-orange-50 p-5 text-orange-950"><p className="text-sm font-black uppercase tracking-[0.12em] text-orange-700">{challengeNames[text(challenge.type)] || "Défi"}</p><p className="mt-3 text-base font-semibold leading-7">{text(challenge.instruction)}</p><details className="mt-4 rounded-xl border border-orange-200 bg-white/80"><summary className="cursor-pointer px-4 py-3 font-black text-orange-800">Découvrir la réponse</summary><div className="border-t border-orange-100 px-4 py-4 text-base leading-7"><p className="font-black">{text(challenge.answer)}</p>{text(challenge.explanation) && <p className="mt-2">{text(challenge.explanation)}</p>}</div></details></article>)}</div></section>}

      {mistakes.length > 0 && <section className="mt-14"><SectionHeading number="8" eyebrow="Reste vigilant" title="Attention" color="bg-orange-600" /><div className="space-y-3">{mistakes.map((mistake, index) => <article key={index} className="border-l-4 border-orange-500 bg-orange-50 px-5 py-4"><p className="font-black text-orange-900">{text(mistake.mistake)}</p><p className="mt-2 text-base leading-7 text-orange-950">{text(mistake.correction)}</p></article>)}</div></section>}

      {tips.length > 0 && <section className="mt-14"><SectionHeading number="9" eyebrow="Méthodes utiles" title="Astuces" color="bg-emerald-600" /><div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-950"><DotList items={tips} dot="bg-emerald-600" /></div></section>}

      {mustRemember.length > 0 && <section className="mt-14 rounded-[2rem] border-2 border-yellow-400 bg-gradient-to-br from-yellow-100 to-amber-50 p-6 sm:p-8"><p className="text-sm font-black uppercase tracking-[0.16em] text-amber-700">L’essentiel</p><h4 className="mt-2 text-2xl font-black text-amber-950">Ce qu’il faut retenir</h4><div className="mt-6"><DotList items={mustRemember} dot="bg-amber-600" /></div></section>}

      {quickReview.length > 0 && <section className="mt-14 rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl sm:p-9"><p className="text-sm font-black uppercase tracking-[0.16em] text-violet-300">Avant le contrôle</p><h4 className="mt-2 text-3xl font-black">En 2 minutes</h4><div className="mt-6 text-slate-100"><DotList items={quickReview} dot="bg-violet-400" /></div></section>}
    </div>
  );
}
