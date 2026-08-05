import type { ReactNode } from "react";

type RevisionSheetContentProps = {
  content: string;
};

const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu;

export function cleanRevisionTitle(value: string) {
  return value.replace(emojiPattern, "").replace(/\s{2,}/g, " ").trim();
}

function renderInlineMarkdown(value: string): ReactNode[] {
  return value.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return part;
  });
}

export default function RevisionSheetContent({
  content,
}: RevisionSheetContentProps) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      index++;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);

    if (heading) {
      const title = cleanRevisionTitle(heading[2].replace(/\*\*/g, ""));
      const level = heading[1].length;

      if (level === 1) {
        blocks.push(
          <h3 key={index} className="mt-8 text-2xl font-bold tracking-tight text-slate-950 first:mt-0">
            {title}
          </h3>
        );
      } else {
        blocks.push(
          <h4 key={index} className="mt-7 text-xl font-bold text-slate-900 first:mt-0">
            {title}
          </h4>
        );
      }

      index++;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];

      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index++;
      }

      blocks.push(
        <ul key={`ul-${index}`} className="my-5 space-y-2 pl-1">
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className="flex gap-3 text-base leading-7 text-slate-700 sm:text-lg">
              <span aria-hidden="true" className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-500" />
              <span>{renderInlineMarkdown(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = [];

      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+[.)]\s+/, ""));
        index++;
      }

      blocks.push(
        <ol key={`ol-${index}`} className="my-5 list-decimal space-y-2 pl-7 text-base leading-7 text-slate-700 marker:font-bold marker:text-purple-600 sm:text-lg">
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className="pl-2">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    const paragraphLines = [line];
    index++;

    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,3})\s+/.test(lines[index].trim()) &&
      !/^[-*]\s+/.test(lines[index].trim()) &&
      !/^\d+[.)]\s+/.test(lines[index].trim())
    ) {
      paragraphLines.push(lines[index].trim());
      index++;
    }

    blocks.push(
      <p key={`p-${index}`} className="my-4 text-base leading-8 text-slate-700 sm:text-lg">
        {renderInlineMarkdown(paragraphLines.join(" "))}
      </p>
    );
  }

  return <div>{blocks}</div>;
}
