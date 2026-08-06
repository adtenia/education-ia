import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import RevisionNotebookContent from "./RevisionNotebookContent";

type RevisionSheetContentProps = {
  content: string;
};

type RevisionSection = {
  title: string;
  shortIntro: string;
  keyPoints: string[];
  definitions: Array<{ term: string; definition: string }>;
  examples: string[];
  formulas: Array<{ expression: string; explanation: string }>;
  dates: Array<{ date: string; event: string }>;
  commonMistakes: string[];
  examTips: string[];
};

type StructuredRevision = {
  title: string;
  introduction: string;
  sections: RevisionSection[];
  importantPoints: string[];
  conclusion: string;
};

const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu;

export function cleanRevisionTitle(value: string) {
  return value
    .replace(emojiPattern, "")
    .replace(/^Fiche de révision/i, "Carnet de révision")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function headingText(children: ReactNode) {
  return String(children).toLocaleLowerCase("fr");
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

function structuredRevision(content: string): StructuredRevision | null {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    if (!parsed || !Array.isArray(parsed.sections)) return null;
    const sections = parsed.sections.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object").map((section) => ({
      title: typeof section.title === "string" ? section.title : "Notion essentielle",
      shortIntro: typeof section.short_intro === "string" ? section.short_intro : "",
      keyPoints: stringArray(section.key_points),
      definitions: Array.isArray(section.definitions) ? section.definitions.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object").map((item) => ({ term: typeof item.term === "string" ? item.term : "Notion", definition: typeof item.definition === "string" ? item.definition : "" })).filter((item) => item.definition) : [],
      examples: stringArray(section.examples),
      formulas: Array.isArray(section.formulas) ? section.formulas.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object").map((item) => ({ expression: typeof item.expression === "string" ? item.expression : "", explanation: typeof item.explanation === "string" ? item.explanation : "" })).filter((item) => item.expression) : [],
      dates: Array.isArray(section.dates) ? section.dates.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object").map((item) => ({ date: typeof item.date === "string" ? item.date : "", event: typeof item.event === "string" ? item.event : "" })).filter((item) => item.date && item.event) : [],
      commonMistakes: stringArray(section.common_mistakes),
      examTips: stringArray(section.exam_tips),
    }));
    if (sections.length === 0) return null;
    return {
      title: typeof parsed.title === "string" ? parsed.title : "Fiche de révision",
      introduction: typeof parsed.introduction === "string" ? parsed.introduction : "",
      sections,
      importantPoints: stringArray(parsed.important_points),
      conclusion: typeof parsed.conclusion === "string" ? parsed.conclusion : "",
    };
  } catch {
    return null;
  }
}

function CardList({ items }: { items: string[] }) {
  return <ul className="space-y-2">{items.map((item, index) => <li key={index} className="flex gap-3 text-base leading-7"><span className="mt-[0.7rem] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" /><span className="min-w-0 break-words">{item}</span></li>)}</ul>;
}

const cardTones = {
  red: "border-red-400 border-l-red-600 bg-red-50 text-red-900",
  green: "border-green-400 border-l-green-600 bg-green-50 text-green-900",
  blue: "border-blue-400 border-l-blue-600 bg-blue-50 text-blue-900",
  yellow: "border-yellow-400 border-l-amber-500 bg-yellow-100 text-slate-900",
  orange: "border-orange-400 border-l-orange-600 bg-orange-50 text-orange-950",
  violet: "border-violet-400 border-l-violet-600 bg-violet-50 text-violet-950",
  slate: "border-slate-300 border-l-slate-500 bg-slate-50 text-slate-800",
} as const;

const labelTones = {
  red: "text-red-700",
  green: "text-green-700",
  blue: "text-blue-700",
  yellow: "text-amber-800",
  orange: "text-orange-700",
  violet: "text-violet-700",
  slate: "text-slate-600",
} as const;

function InfoCard({ label, tone, children }: { label: string; tone: keyof typeof cardTones; children: ReactNode }) {
  return (
    <aside className={`print-keep min-w-0 rounded-2xl border border-l-4 p-5 shadow-sm ${cardTones[tone]}`}>
      <p className={`text-sm font-black uppercase tracking-[0.12em] ${labelTones[tone]}`}>{label}</p>
      <div className="mt-3 text-base leading-7">{children}</div>
    </aside>
  );
}

function StructuredRevisionContent({ revision }: { revision: StructuredRevision }) {
  return (
    <div className="text-slate-700">
      <header className="border-b border-slate-200 pb-5">
        <h4 className="text-xl font-black tracking-tight text-slate-950">{revision.title}</h4>
        {revision.introduction && <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">{revision.introduction}</p>}
      </header>

      <div className="mt-8 space-y-10">
        {revision.sections.map((section, sectionIndex) => (
          <section key={`${section.title}-${sectionIndex}`} className="border-t border-slate-200 pt-8 first:border-0 first:pt-0">
            <div className="flex items-start gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">{sectionIndex + 1}</span>
              <div><h5 className="text-xl font-black text-slate-950">{section.title}</h5>{section.shortIntro && <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">{section.shortIntro}</p>}</div>
            </div>

            <div className="mt-6 grid auto-rows-fr gap-4 md:grid-cols-2">
              {section.keyPoints.length > 0 && <InfoCard label="Points clés" tone="yellow"><CardList items={section.keyPoints} /></InfoCard>}
              {section.definitions.map((item, index) => <InfoCard key={`${item.term}-${index}`} label="Définition" tone="red"><h6 className="text-lg font-black text-red-800">{item.term}</h6><p className="mt-2 break-words">{item.definition}</p></InfoCard>)}
              {section.examples.map((item, index) => <InfoCard key={index} label="Exemple" tone="blue"><p className="break-words">{item}</p></InfoCard>)}
              {section.formulas.map((item, index) => <InfoCard key={index} label="Formule" tone="violet"><p className="whitespace-pre-wrap break-words rounded-xl bg-white/80 p-3 font-mono font-bold [overflow-wrap:anywhere]">{item.expression}</p>{item.explanation && <p className="mt-3 break-words">{item.explanation}</p>}</InfoCard>)}
              {section.dates.length > 0 && <InfoCard label="Dates à connaître" tone="slate"><dl className="space-y-3">{section.dates.map((item, index) => <div key={`${item.date}-${index}`}><dt className="text-lg font-black text-slate-950">{item.date}</dt><dd className="mt-1 break-words">{item.event}</dd></div>)}</dl></InfoCard>}
              {section.commonMistakes.length > 0 && <InfoCard label="Attention" tone="orange"><CardList items={section.commonMistakes} /></InfoCard>}
              {section.examTips.length > 0 && <InfoCard label="Conseil pour réussir" tone="green"><CardList items={section.examTips} /></InfoCard>}
            </div>
          </section>
        ))}
      </div>

      {revision.importantPoints.length > 0 && <div className="mt-10"><InfoCard label="À retenir" tone="green"><CardList items={revision.importantPoints} /></InfoCard></div>}
      {revision.conclusion && <div className="mt-10 border-t border-slate-200 pt-7"><p className="text-sm font-black uppercase tracking-[0.12em] text-violet-700">Conclusion</p><p className="mt-3 text-base leading-7 text-slate-700">{revision.conclusion}</p></div>}
    </div>
  );
}

export default function RevisionSheetContent({ content }: RevisionSheetContentProps) {
  const safeContent = content.replace(emojiPattern, "");
  try {
    const parsed = JSON.parse(safeContent) as Record<string, unknown>;
    if (parsed.format_version === "revision_notebook_v1") {
      return <RevisionNotebookContent data={parsed} />;
    }
  } catch {
    // Les anciennes fiches Markdown sont traitées plus bas.
  }
  const revision = structuredRevision(safeContent);

  if (revision) return <StructuredRevisionContent revision={revision} />;

  return (
    <div className="revision-markdown print-content text-slate-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h3 className="mb-6 text-xl font-black tracking-tight text-slate-950">
              {children}
            </h3>
          ),
          h2: ({ children }) => {
            const text = headingText(children);
            const color = text.includes("définition")
              ? "border-red-400 bg-red-50 text-red-800"
              : text.includes("attention") || text.includes("erreur") || text.includes("piège")
                ? "border-orange-200 bg-orange-50 text-orange-950"
                : text.includes("formule") || text.includes("méthode")
                  ? "border-violet-200 bg-violet-50 text-violet-950"
              : text.includes("important") || text.includes("mémoriser") || text.includes("retenir")
                ? "border-green-400 bg-green-50 text-green-800"
                : "border-blue-200 bg-blue-50 text-blue-950";

            return (
              <h4 className={`mb-4 mt-8 rounded-2xl border-2 px-5 py-4 text-xl font-black first:mt-0 ${color}`}>
                {children}
              </h4>
            );
          },
          h3: ({ children }) => (
            <h5 className="mb-3 mt-6 text-lg font-black text-slate-900">{children}</h5>
          ),
          p: ({ children }) => (
            <p className="my-4 text-base leading-7">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="rounded-sm bg-yellow-200 px-1 py-0.5 font-black text-slate-950 box-decoration-clone">{children}</strong>
          ),
          ul: ({ children }) => <ul className="my-5 list-disc space-y-2 pl-7 marker:text-blue-600">{children}</ul>,
          ol: ({ children }) => (
            <ol className="my-5 list-decimal space-y-2 pl-7 marker:font-bold marker:text-blue-700">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="ml-5 pl-1 text-base leading-7 marker:text-blue-600">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-5 rounded-2xl border-2 border-red-400 bg-red-50 px-5 py-1 text-red-900 shadow-sm [&_strong]:bg-transparent [&_strong]:text-red-800">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="bg-slate-100 px-4 py-3 font-bold text-slate-950">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-t border-slate-200 px-4 py-3 leading-7">{children}</td>
          ),
        }}
      >
        {safeContent}
      </ReactMarkdown>
    </div>
  );
}
