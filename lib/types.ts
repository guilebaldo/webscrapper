export type ScrapeMode = "html" | "js" | "json";

export type FieldDef = {
  label: string;
  /** CSS selector (html/js) or property path relative to each list item (json) */
  path: string;
};

export type ScrapeRequest = {
  urls: string[];
  mode: ScrapeMode;
  /** CSS selector for each repeating item (html/js). Empty = page as one row. */
  itemSelector?: string;
  fields: FieldDef[];
  /** CSS selector for images within each item (html/js), or property path (json). */
  imageSelector?: string;
  /** Absolute base for relative image URLs */
  imageBaseUrl?: string;
  /** JSON: path to the array of items, e.g. "refacciones" or "data.items" */
  listPath?: string;
  /** JSON API method */
  method?: "GET" | "POST";
  /** JSON: form fields as key/value (application/x-www-form-urlencoded or multipart via formFields) */
  formFields?: Record<string, string>;
  /** JSON: raw JSON body */
  jsonBody?: unknown;
  contentType?: "form" | "json" | "none";
};

export type ScrapeRow = {
  sourceUrl: string;
  data: Record<string, string>;
  images: string[];
};

export type ScrapeResult = {
  rows: ScrapeRow[];
  images: string[];
  truncated: boolean;
  warnings: string[];
};

export type ExportFormat = "csv" | "xlsx" | "pdf";

export const LIMITS = {
  maxUrls: 10,
  maxItems: 50,
  maxImages: 30,
  requestDelayMs: 250,
  fetchTimeoutMs: 25_000,
} as const;

export const USER_AGENT =
  "PullsheetBot/1.0 (+https://localhost; personal data export tool)";
