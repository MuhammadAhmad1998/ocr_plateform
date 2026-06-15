/** Collapse stray single newlines (SSE streaming artifact) while keeping paragraph breaks. */
export function collapseStrayNewlines(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/([^\n])\n(?!\n)(?=[^\n])/g, "$1 ");
}

/** Strip internal recommendation JSON blocks from advisor chat text. */
export function sanitizeAdvisorContent(content: string): string {
  let text = collapseStrayNewlines(content);

  text = text
    .replace(/```(?:json)?\s*[\s\S]*?```/gi, "")
    .replace(/```(?:json)?[\s\S]*$/gi, "")
    .replace(/`{1,2}\s*$/g, "");

  const recStart = text.search(/\{\s*"recommendation"\s*:/i);
  if (recStart !== -1) {
    const slice = text.slice(recStart);
    let depth = 0;
    let end = -1;
    for (let i = 0; i < slice.length; i++) {
      const ch = slice[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          end = recStart + i + 1;
          break;
        }
      }
    }
    if (end !== -1) {
      text = text.slice(0, recStart) + text.slice(end);
    }
  }

  return text.replace(/\n{3,}/g, "\n\n").trim();
}

type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

export function parseAdvisorBlocks(content: string): ContentBlock[] {
  const lines = sanitizeAdvisorContent(content).split("\n");
  const blocks: ContentBlock[] = [];
  let paragraphLines: string[] = [];
  let ulItems: string[] = [];
  let olItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length) {
      blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
      paragraphLines = [];
    }
  };

  const flushUl = () => {
    if (ulItems.length) {
      blocks.push({ type: "ul", items: [...ulItems] });
      ulItems = [];
    }
  };

  const flushOl = () => {
    if (olItems.length) {
      blocks.push({ type: "ol", items: [...olItems] });
      olItems = [];
    }
  };

  const flushAll = () => {
    flushUl();
    flushOl();
    flushParagraph();
  };

  for (const line of lines) {
    const ulMatch = line.match(/^[-*]\s+(.+)/);
    const olMatch = line.match(/^\d+\.\s+(.+)/);

    if (ulMatch) {
      flushOl();
      flushParagraph();
      ulItems.push(ulMatch[1]);
    } else if (olMatch) {
      flushUl();
      flushParagraph();
      olItems.push(olMatch[1]);
    } else if (line.trim() === "") {
      flushAll();
    } else {
      flushUl();
      flushOl();
      paragraphLines.push(line.trim());
    }
  }

  flushAll();
  return blocks;
}
