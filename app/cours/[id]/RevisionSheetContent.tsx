import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type RevisionSheetContentProps = {
  content: string;
};

const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu;

export function cleanRevisionTitle(value: string) {
  return value.replace(emojiPattern, "").replace(/\s{2,}/g, " ").trim();
}

function headingText(children: ReactNode) {
  return String(children).toLocaleLowerCase("fr");
}

export default function RevisionSheetContent({ content }: RevisionSheetContentProps) {
  const safeContent = content.replace(emojiPattern, "");

  return (
    <div className="revision-markdown print-content text-slate-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h3 className="mb-7 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {children}
            </h3>
          ),
          h2: ({ children }) => {
            const text = headingText(children);
            const color = text.includes("définition")
              ? "border-red-200 bg-red-50 text-red-950"
              : text.includes("important") || text.includes("mémoriser") || text.includes("retenir")
                ? "border-amber-200 bg-amber-50 text-amber-950"
                : "border-blue-200 bg-blue-50 text-blue-950";

            return (
              <h4 className={`mb-4 mt-9 rounded-xl border px-4 py-3 text-xl font-bold first:mt-0 ${color}`}>
                {children}
              </h4>
            );
          },
          h3: ({ children }) => (
            <h5 className="mb-3 mt-7 text-lg font-bold text-slate-900">{children}</h5>
          ),
          p: ({ children }) => (
            <p className="my-4 text-base leading-8 sm:text-lg">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-slate-950">{children}</strong>
          ),
          ul: ({ children }) => <ul className="my-5 space-y-2 pl-1">{children}</ul>,
          ol: ({ children }) => (
            <ol className="my-5 list-decimal space-y-2 pl-7 marker:font-bold marker:text-blue-700">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="ml-5 pl-1 text-base leading-7 marker:text-blue-600 sm:text-lg">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-5 rounded-2xl border border-red-100 bg-red-50/70 px-5 py-1 text-red-950 shadow-sm">
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
