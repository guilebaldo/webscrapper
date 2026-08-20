# Pullsheet

App web para scrapear datos e imágenes desde una URL (HTML, render JavaScript o API JSON), previsualizar una tabla y exportar **CSV**, **XLSX**, **PDF** o un **ZIP** de fotos.

## Flujo

1. Pega una o más URLs (una por línea).
2. Elige modo: HTML estático, render JS, o JSON API.
3. Define campos (`label` + selector CSS / path JSON) y selector de imágenes.
4. Scrapea y revisa la tabla (puedes quitar filas).
5. Descarga CSV / XLSX / PDF o ZIP de fotos.

Los archivos se descargan en el navegador. Un sitio web no puede escribir carpetas arbitrarias en tu PC.

## Presets

Incluye presets de ejemplo y **Car Plus (API JSON)** porque el catálogo en `carplusonline.com.mx` es una SPA: los datos vienen de `https://carplus.ingeniabit.com/api/refacciones/index`.

## Límites (MVP)

- Hasta 10 URLs, 50 filas y 30 imágenes por job.
- Delay breve entre requests y User-Agent identificable (`PullsheetBot/1.0`).

## Uso responsable

Respeta términos del sitio, `robots.txt` y derechos de autor de las fotografías. Solo scrapea contenido que tengas derecho a usar.

## Desarrollo

```bash
npm install
npm run dev
```

```bash
npm test
npm run build
```

### Render JavaScript

El modo JS usa `puppeteer-core` + `@sparticuz/chromium` (apto para serverless). En local descarga el binario de Chromium la primera vez. Si falla, usa HTML o JSON API.

## Stack

Next.js App Router, Cheerio, ExcelJS, jsPDF, JSZip, Puppeteer Core.
