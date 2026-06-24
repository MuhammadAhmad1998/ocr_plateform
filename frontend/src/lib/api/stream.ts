import { parseSSEBuffer } from "../sse";
import { API_V1_URL } from "./config";
import { getToken, parseApiError } from "./client";
import type { Recommendation, ResponseMeta } from "./types";

export function streamMessage(
  sessionId: string,
  content: string,
  onChunk: (text: string) => void,
  onRecommendation: (rec: Recommendation) => void,
  onDone: () => void,
  onError: (err: Error) => void,
  onMeta?: (meta: ResponseMeta) => void
) {
  const token = getToken();
  const controller = new AbortController();

  if (!token) {
    onError(new Error("Not authenticated"));
    return () => controller.abort();
  }

  fetch(`${API_V1_URL}/advisor/message/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ session_id: sessionId, content }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        throw await parseApiError(res, "Stream failed");
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;

      const handleEvent = (eventType: string, data: string) => {
        if (eventType === "message" && data) onChunk(data);
        if (eventType === "meta" && data && onMeta) {
          try {
            onMeta(JSON.parse(data) as ResponseMeta);
          } catch {}
        }
        if (eventType === "recommendation" && data) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.recommendation) onRecommendation(parsed.recommendation);
          } catch {}
        }
        if (eventType === "done" && !finished) {
          finished = true;
          onDone();
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parsed = parseSSEBuffer(buffer);
        buffer = parsed.remainder;
        for (const evt of parsed.events) {
          handleEvent(evt.event, evt.data);
        }
      }

      if (buffer.trim()) {
        const parsed = parseSSEBuffer(`${buffer}\n\n`);
        for (const evt of parsed.events) {
          handleEvent(evt.event, evt.data);
        }
      }

      if (!finished) onDone();
    })
    .catch(onError);

  return () => controller.abort();
}
