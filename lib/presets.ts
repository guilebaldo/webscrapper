import type { ScrapeRequest } from "./types";

export type Preset = {
  id: string;
  name: string;
  description: string;
  config: Partial<ScrapeRequest> & { urls: string[] };
};

export const PRESETS: Preset[] = [
  {
    id: "html-articles",
    name: "Artículos HTML",
    description: "Lista genérica de <article> con título, enlace e imagen.",
    config: {
      urls: ["https://example.com"],
      mode: "html",
      itemSelector: "article",
      fields: [
        { label: "titulo", path: "h2, h3, .title" },
        { label: "enlace", path: "a@href" },
      ],
      imageSelector: "img@src",
    },
  },
  {
    id: "html-cards",
    name: "Tarjetas de producto",
    description: "Patrón común .product / .card con nombre, precio e imagen.",
    config: {
      urls: ["https://example.com/catalogo"],
      mode: "html",
      itemSelector: ".product, .card, [data-product]",
      fields: [
        { label: "nombre", path: "h2, h3, .name, .title" },
        { label: "precio", path: ".price, [data-price]" },
      ],
      imageSelector: "img@src",
    },
  },
  {
    id: "carplus-api",
    name: "Car Plus (API JSON)",
    description:
      "Catálogo de refacciones vía API pública (el HTML del sitio es SPA vacío).",
    config: {
      urls: ["https://carplus.ingeniabit.com/api/refacciones/index"],
      mode: "json",
      method: "POST",
      contentType: "form",
      formFields: { origin: "website" },
      listPath: "refacciones",
      fields: [
        { label: "codigo", path: "re_cod_carmas" },
        { label: "descripcion", path: "re_descripcion" },
        { label: "precio", path: "re_precio" },
        { label: "imagen", path: "re_path_img" },
      ],
      imageSelector: "re_path_img",
      imageBaseUrl: "https://carplus.ingeniabit.com/",
    },
  },
];
