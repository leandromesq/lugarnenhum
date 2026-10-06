import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const pages = ["", "musica", "loja", "quem-somos", "presskit"];

for (const page of pages) {
  test(`Static page /${page} has accessible content and working local assets`, async () => {
    const html = await readFile(join("out", page, "index.html"), "utf8");
    assert.match(html, /<html[^>]*lang="pt-BR"/);
    assert.match(html, /<h1\b/);
    assert.match(html, /id="conteudo"/);
    assert.match(html, /aria-label="Navegação principal"/);
    assert.doesNotMatch(html, /href="#"/);
    for (const route of ["musica", "loja", "quem-somos"]) {
      assert.ok(
        html.includes(`href="${basePath}/${route}/"`) ||
          html.includes(`href="${basePath}/${route}"`),
        `Missing navigation to ${route}`,
      );
    }
    const paths = [
      ...html.matchAll(
        /(?:src|srcSet|href)="([^" ]*\/assets\/pencil\/[^" ]+)"/g,
      ),
    ].map((match) => match[1]);
    assert.ok(paths.length > 0, "Page should contain actual brand assets");
    for (const path of new Set(paths)) {
      assert.ok(
        path.startsWith(`${basePath}/assets/pencil/`),
        `Wrong asset base path: ${path}`,
      );
      await access(join("public", path.slice(basePath.length)));
    }
  });
}

test("Export includes a useful 404", async () => {
  const html = await readFile("out/404.html", "utf8");
  assert.match(html, /SINAL NÃO ENCONTRADO/);
});

test("Mobile photographic sources are present", async () => {
  for (const [page, scene] of [
    ["", "home"],
    ["quem-somos", "about"],
  ]) {
    const html = await readFile(join("out", page, "index.html"), "utf8");
    assert.ok(html.includes(`${scene}-mobile.webp`));
    assert.ok(html.includes(`${scene}-desktop.webp`));
  }
});
