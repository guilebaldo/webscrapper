import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractHtmlRows } from "../scrape/html";
import { extractJsonRows, getByPath } from "../scrape/json";

describe("getByPath", () => {
  it("resolves nested keys", () => {
    assert.equal(getByPath({ a: { b: 1 } }, "a.b"), 1);
  });
});

describe("extractHtmlRows", () => {
  it("extracts fields and images from articles", () => {
    const html = `
      <html><body>
        <article><h2>Uno</h2><a href="/a">link</a><img src="/i1.jpg" /></article>
        <article><h2>Dos</h2><a href="/b">link</a><img src="/i2.jpg" /></article>
      </body></html>
    `;
    const { rows, truncated } = extractHtmlRows(
      html,
      "https://example.com/list",
      "article",
      [
        { label: "titulo", path: "h2" },
        { label: "enlace", path: "a@href" },
      ],
      "img@src",
      undefined,
      50,
    );
    assert.equal(truncated, false);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].data.titulo, "Uno");
    assert.equal(rows[0].data.enlace, "https://example.com/a");
    assert.equal(rows[0].images[0], "https://example.com/i1.jpg");
  });
});

describe("extractJsonRows", () => {
  it("maps Car Plus-like payload", () => {
    const payload = {
      refacciones: [
        {
          re_cod_carmas: "CAR1",
          re_descripcion: "Soporte",
          re_precio: 10.5,
          re_path_img: "images/refacciones/a.png",
        },
      ],
    };
    const { rows } = extractJsonRows(
      payload,
      "refacciones",
      [
        { label: "codigo", path: "re_cod_carmas" },
        { label: "descripcion", path: "re_descripcion" },
        { label: "precio", path: "re_precio" },
      ],
      "re_path_img",
      "https://carplus.ingeniabit.com/",
      "https://api.example/index",
      50,
    );
    assert.equal(rows[0].data.codigo, "CAR1");
    assert.equal(rows[0].data.precio, "10.5");
    assert.equal(
      rows[0].images[0],
      "https://carplus.ingeniabit.com/images/refacciones/a.png",
    );
  });
});
