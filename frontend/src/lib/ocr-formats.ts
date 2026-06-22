export const OCR_OUTPUT_FORMATS = [
  {
    value: "plain_text",
    label: "Plain Text",
    description: "Raw text extraction without formatting",
  },
  {
    value: "markdown",
    label: "Markdown",
    description: "Structured Markdown document output",
  },
  {
    value: "json",
    label: "JSON / Layout",
    description: "Structured JSON with layout elements and bboxes",
  },
  {
    value: "html",
    label: "HTML",
    description: "HTML output with table markup",
  },
  {
    value: "formatted",
    label: "Formatted",
    description: "Layout-preserving formatted text",
  },
] as const;

export type OcrOutputFormat = (typeof OCR_OUTPUT_FORMATS)[number]["value"];

export const SUPPORTED_TESTING_MODEL_TYPES = new Set([
  "paddle_ocr",
  "got_ocr",
  "qianfan_ocr",
  "vlm",
  "infinity_parser",
]);

export function formatOutputFormatLabel(value: string): string {
  return OCR_OUTPUT_FORMATS.find((f) => f.value === value)?.label ?? value;
}

export function tryFormatJson(text: string): { formatted: string; isJson: boolean } {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return { formatted: text, isJson: false };
  }
  try {
    const parsed = JSON.parse(trimmed);
    return { formatted: JSON.stringify(parsed, null, 2), isJson: true };
  } catch {
    return { formatted: text, isJson: false };
  }
}
