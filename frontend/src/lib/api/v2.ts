import { fetchV2, json } from "./client";
import type { Document, ModelInfo, OcrJob, V2Envelope } from "./types";

export const v2 = {
  listModels: async () => {
    const res = await fetchV2("/models/");
    return json<V2Envelope<{ models: ModelInfo[] }>>(res);
  },

  createDocument: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetchV2("/documents/", { method: "POST", body: form });
    return json<V2Envelope<Document>>(res);
  },

  listDocuments: async (params?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    const res = await fetchV2(`/documents/${q ? `?${q}` : ""}`);
    return json<V2Envelope<{ documents: Document[]; total: number }>>(res);
  },

  getDocument: async (documentId: string) => {
    const res = await fetchV2(`/documents/${documentId}/`);
    return json<V2Envelope<Document>>(res);
  },

  submitOcrJob: async (data: { document_id: string; tier_slug?: string; webhook_url?: string }) => {
    const res = await fetchV2("/ocr/jobs/", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return json<V2Envelope<OcrJob>>(res);
  },

  getOcrJob: async (jobId: string) => {
    const res = await fetchV2(`/ocr/jobs/${jobId}/`);
    return json<V2Envelope<OcrJob>>(res);
  },
};
