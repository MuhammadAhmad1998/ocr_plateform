import { parseAdvisorBlocks } from "@/lib/advisorMessage";

function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-${i}`} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    )
  );
}

export function ChatMessageContent({ content }: { content: string }) {
  const blocks = parseAdvisorBlocks(content);

  if (!blocks.length) return null;

  return (
    <div className="min-w-0 space-y-2 break-words [overflow-wrap:anywhere]">
      {blocks.map((block, i) => {
        if (block.type === "ul") {
          return (
            <ul key={i} className="ml-4 list-disc space-y-1">
              {block.items.map((item, j) => (
                <li key={j} className="leading-relaxed">
                  {renderInline(item, `ul${i}-${j}`)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "ol") {
          return (
            <ol key={i} className="ml-4 list-decimal space-y-1">
              {block.items.map((item, j) => (
                <li key={j} className="leading-relaxed">
                  {renderInline(item, `ol${i}-${j}`)}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={i} className="break-words leading-relaxed [overflow-wrap:anywhere]">
            {renderInline(block.text, `p${i}`)}
          </p>
        );
      })}
    </div>
  );
}
