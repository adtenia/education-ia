import type { SummaryOverview } from "./StructuredCourseContent";

type SummaryContentProps = {
  summary: string;
  overview?: SummaryOverview | null;
};

const fallbackTitles = [
  "Comprendre l’idée principale",
  "Les mécanismes importants",
  "Les éléments à connaître",
  "Mise en perspective",
];

function sentences(text: string) {
  return text.replace(/\s+/g, " ").match(/[^.!?]+(?:[.!?]+[»”"]?|$)/g)?.map((item) => item.trim()).filter(Boolean) ?? [];
}

function splitSentences(items: string[], groupCount: number) {
  return Array.from({ length: groupCount }, (_, index) => {
    const start = Math.floor((index * items.length) / groupCount);
    const end = Math.floor(((index + 1) * items.length) / groupCount);
    return items.slice(start, Math.max(start + 1, end)).join(" ");
  }).filter(Boolean);
}

function fallbackOverview(summary: string): SummaryOverview {
  const parts = sentences(summary.trim());
  if (parts.length <= 2) {
    return {
      introduction: parts.join(" ") || "Aucun résumé disponible.",
      sections: [],
      mustRemember: [],
      commonMistakes: [],
      conclusion: "",
    };
  }

  const introduction = parts.splice(0, Math.min(2, parts.length));
  const conclusion = parts.length >= 4 ? parts.pop() || "" : "";
  const groupCount = Math.min(4, Math.max(2, Math.ceil(parts.length / 2)));
  const groups = splitSentences(parts, groupCount);

  return {
    introduction: introduction.join(" "),
    sections: groups.map((paragraph, index) => ({
      title: fallbackTitles[index],
      paragraphs: [paragraph],
      definition: "",
      example: "",
    })),
    mustRemember: [],
    commonMistakes: [],
    conclusion,
  };
}

function romanNumber(index: number) {
  return ["I", "II", "III", "IV", "V"][index] || String(index + 1);
}

export default function SummaryContent({ summary, overview }: SummaryContentProps) {
  const content = overview || fallbackOverview(summary);

  return (
    <article className="mx-auto max-w-4xl px-5 py-10 sm:px-9 sm:py-14 lg:py-16">
      <header className="border-b border-slate-200 pb-8">
        <div className="flex items-center gap-4">
          <span className="h-10 w-1.5 rounded-full bg-gradient-to-b from-violet-500 to-indigo-600" />
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Résumé du cours</p>
            <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Synthèse du chapitre</h2>
          </div>
        </div>
        {content.introduction && (
          <p className="mt-7 max-w-3xl break-words text-lg font-medium leading-8 text-slate-700 sm:text-xl sm:leading-9">{content.introduction}</p>
        )}
      </header>

      {content.sections.length > 0 && (
        <div className="mt-10">
          {content.sections.slice(0, 5).map((section, index) => (
            <section key={`${section.title}-${index}`} className="border-b border-slate-200 py-9 first:pt-0 last:border-b-0">
              <div className="flex items-baseline gap-4">
                <span className="shrink-0 font-serif text-xl font-bold text-violet-600">{romanNumber(index)}.</span>
                <h3 className="text-xl font-black text-slate-950 sm:text-2xl">{section.title}</h3>
              </div>

              <div className="mt-5 space-y-5 sm:pl-10">
                {section.paragraphs.slice(0, 3).map((paragraph, paragraphIndex) => (
                  <p key={paragraphIndex} className="max-w-3xl break-words text-base leading-8 text-slate-700 sm:text-lg sm:leading-9">{paragraph}</p>
                ))}

                {section.definition && (
                  <aside className="max-w-3xl border-l-4 border-red-400 bg-red-50/70 px-5 py-4 text-red-950">
                    <p className="text-sm font-black uppercase tracking-[0.12em] text-red-700">Définition importante</p>
                    <p className="mt-2 break-words text-base leading-7">{section.definition}</p>
                  </aside>
                )}

                {section.example && (
                  <aside className="max-w-3xl border-l-4 border-blue-400 bg-blue-50/70 px-5 py-4 text-blue-950">
                    <p className="text-sm font-black uppercase tracking-[0.12em] text-blue-700">Exemple</p>
                    <p className="mt-2 break-words text-base leading-7">{section.example}</p>
                  </aside>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {content.mustRemember.length > 0 && (
        <aside className="mt-10 rounded-3xl border border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-100/80 px-6 py-6 sm:px-8">
          <h3 className="text-xl font-black text-amber-950">Ce qu’il faut retenir</h3>
          <ul className="mt-5 space-y-3">
            {content.mustRemember.slice(0, 5).map((point, index) => (
              <li key={index} className="flex gap-3 text-base font-semibold leading-7 text-slate-900">
                <span className="mt-[0.65rem] h-2 w-2 shrink-0 rounded-full bg-amber-600" />
                <span className="break-words">{point}</span>
              </li>
            ))}
          </ul>
        </aside>
      )}

      {content.commonMistakes.length > 0 && (
        <aside className="mt-8 border-l-4 border-orange-400 bg-orange-50/70 px-5 py-5 text-orange-950 sm:px-7">
          <h3 className="text-xl font-black text-orange-900">Attention aux erreurs fréquentes</h3>
          <ul className="mt-4 space-y-3">
            {content.commonMistakes.map((mistake, index) => <li key={index} className="flex gap-3 text-base leading-7"><span className="mt-[0.65rem] h-2 w-2 shrink-0 rounded-full border-2 border-orange-600" /><span className="break-words">{mistake}</span></li>)}
          </ul>
        </aside>
      )}

      {content.conclusion && (
        <footer className="mt-12 border-t border-slate-200 pt-8 sm:grid sm:grid-cols-[8rem_1fr] sm:gap-8">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-violet-700">Conclusion</p>
          <p className="mt-3 max-w-3xl break-words text-base font-medium leading-8 text-slate-700 sm:mt-0 sm:text-lg">{content.conclusion}</p>
        </footer>
      )}
    </article>
  );
}
