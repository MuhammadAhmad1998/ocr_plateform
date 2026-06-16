/** Parse Server-Sent Events from a text buffer (handles multi-line data fields). */
export function parseSSEBuffer(buffer: string): {
  events: Array<{ event: string; data: string }>;
  remainder: string;
} {
  const events: Array<{ event: string; data: string }> = [];
  const blocks = buffer.split(/\r?\n\r?\n/);
  const remainder = blocks.pop() ?? "";

  for (const block of blocks) {
    if (!block.trim()) continue;

    let eventType = "message";
    const dataLines: string[] = [];

    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith("event:")) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        let value = line.slice(5);
        if (value.startsWith(" ")) value = value.slice(1);
        dataLines.push(value);
      }
    }

    if (dataLines.length) {
      events.push({ event: eventType, data: dataLines.join("\n") });
    }
  }

  return { events, remainder };
}
