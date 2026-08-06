export type DefinitionItem = {
  term: string;
  definition: string;
};

export type FormulaItem = {
  expression: string;
  explanation: string;
};

export type DateItem = {
  date: string;
  event: string;
};

export type CourseSection = {
  title: string;
  shortIntro: string;
  paragraphs: string[];
  keyPoints: string[];
  definitions: DefinitionItem[];
  examples: string[];
  formulas: FormulaItem[];
  dates: DateItem[];
  commonMistakes: string[];
  examTips: string[];
};

export type SummaryOverview = {
  introduction: string;
  sections: Array<{ title: string; paragraphs: string[]; definition: string; example: string }>;
  mustRemember: string[];
  commonMistakes: string[];
  conclusion: string;
};

export type StructuredCourse = {
  title: string;
  introduction: string;
  summaryOverview: SummaryOverview | null;
  sections: CourseSection[];
  importantPoints: string[];
  conclusion: string;
};

function BulletList({ items, dotClass }: { items: string[]; dotClass: string }) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map((item, index) => (
        <li key={index} className="flex min-w-0 gap-3 leading-7">
          <span aria-hidden="true" className={`mt-[0.7rem] h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
          <span className="min-w-0 break-words">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function StructuredCourseContent({ course }: { course: StructuredCourse }) {
  return (
    <div className="px-5 py-9 sm:px-10 sm:py-12 lg:px-14">
      {course.introduction && (
        <div className="mx-auto max-w-3xl border-l-4 border-violet-300 pl-5 sm:pl-7">
          <p className="text-lg leading-8 text-slate-700 sm:text-xl sm:leading-9">{course.introduction}</p>
        </div>
      )}

      <div className="mx-auto mt-14 max-w-4xl space-y-16 sm:mt-16 sm:space-y-20">
        {course.sections.map((section, sectionIndex) => (
          <section key={`${section.title}-${sectionIndex}`} className="print-course-section scroll-mt-24">
            <header className="mb-8 border-b border-slate-200 pb-6">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-sm font-black text-white shadow-md shadow-violet-200">
                  {sectionIndex + 1}
                </span>
                <div className="min-w-0">
                  <h2 className="break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{section.title}</h2>
                  {section.shortIntro && <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">{section.shortIntro}</p>}
                </div>
              </div>
            </header>

            {section.paragraphs.length > 0 && (
              <div className="mx-auto max-w-3xl space-y-6 text-base leading-8 text-slate-700 sm:text-lg sm:leading-9">
                {section.paragraphs.map((paragraph, index) => <p key={index} className="break-words">{paragraph}</p>)}
              </div>
            )}

            <div className="mt-9 grid gap-5">
              {section.keyPoints.length > 0 && (
                <aside className="print-keep rounded-3xl border border-amber-200 bg-amber-50/80 p-5 text-amber-950 sm:p-7">
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-amber-700">À retenir</p>
                  <BulletList items={section.keyPoints} dotClass="bg-amber-500" />
                </aside>
              )}

              {section.definitions.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {section.definitions.map((item, index) => (
                    <aside key={`${item.term}-${index}`} className="print-keep rounded-3xl border border-red-200 bg-red-50/70 p-5 text-red-950 sm:p-6">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">Définition</p>
                      <h3 className="mt-3 break-words text-lg font-black">{item.term}</h3>
                      <p className="mt-3 break-words leading-7">{item.definition}</p>
                    </aside>
                  ))}
                </div>
              )}

              {section.examples.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {section.examples.map((example, index) => (
                    <aside key={index} className="print-keep rounded-3xl border border-blue-200 bg-blue-50/75 p-5 text-blue-950 sm:p-6">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Exemple</p>
                      <p className="mt-3 break-words leading-7">{example}</p>
                    </aside>
                  ))}
                </div>
              )}

              {section.formulas.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {section.formulas.map((formula, index) => (
                    <aside key={index} className="print-keep min-w-0 rounded-3xl border border-violet-200 bg-violet-50/70 p-5 text-violet-950 sm:p-6">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Formule</p>
                      <p className="mt-4 whitespace-pre-wrap break-words rounded-2xl bg-white/80 px-4 py-3 font-mono text-base font-bold leading-7 [overflow-wrap:anywhere]">{formula.expression}</p>
                      {formula.explanation && <p className="mt-3 break-words leading-7">{formula.explanation}</p>}
                    </aside>
                  ))}
                </div>
              )}

              {section.dates.length > 0 && (
                <aside className="print-keep rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-7">
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-600">Dates à connaître</p>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    {section.dates.map((item, index) => <div key={`${item.date}-${index}`} className="rounded-2xl bg-white p-4"><dt className="font-black text-slate-950">{item.date}</dt><dd className="mt-2 break-words leading-7 text-slate-700">{item.event}</dd></div>)}
                  </dl>
                </aside>
              )}

              {section.commonMistakes.length > 0 && (
                <aside className="print-keep rounded-3xl border border-orange-200 bg-orange-50/80 p-5 text-orange-950 sm:p-7">
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-orange-700">Attention</p>
                  <BulletList items={section.commonMistakes} dotClass="bg-orange-500" />
                </aside>
              )}

              {section.examTips.length > 0 && (
                <aside className="print-keep rounded-3xl border border-emerald-200 bg-emerald-50/75 p-5 text-emerald-950 sm:p-7">
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">Conseil pour réussir</p>
                  <BulletList items={section.examTips} dotClass="bg-emerald-500" />
                </aside>
              )}
            </div>
          </section>
        ))}
      </div>

      {course.importantPoints.length > 0 && (
        <section className="print-keep mx-auto mt-16 max-w-4xl rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-950 sm:p-8">
          <h2 className="text-2xl font-black">L’essentiel du cours</h2>
          <BulletList items={course.importantPoints} dotClass="bg-amber-500" />
        </section>
      )}

      {course.conclusion && (
        <section className="print-course-conclusion mx-auto mt-14 max-w-3xl border-t border-slate-200 pt-9">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-600">Conclusion</p>
          <p className="mt-4 break-words text-base leading-8 text-slate-700 sm:text-lg">{course.conclusion}</p>
        </section>
      )}
    </div>
  );
}
