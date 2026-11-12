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

const memberNames = [
  "Leandro Mesquita",
  "José Macedo",
  "Pedro Gazoni",
  "Eduardo Lapenta",
];

const pressFiles = [
  "/assets/press/lugar-nenhum-foto-colina.jpg",
  "/assets/press/lugar-nenhum-foto-fachada.jpg",
  "/assets/press/lugar-nenhum-logo-branco.png",
  "/assets/press/lugar-nenhum-logo-preto.png",
  "/assets/press/lugar-nenhum-simbolo-branco.png",
  "/assets/press/lugar-nenhum-simbolo-preto.png",
];

const removedSvgs = [
  "file.svg",
  "globe.svg",
  "next.svg",
  "vercel.svg",
  "window.svg",
  "assets/logo-placeholder.svg",
  "assets/og-placeholder.svg",
  "assets/release-placeholder.svg",
  "assets/texture-dither.svg",
];

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

test("Presskit exports the long-form material and its downloads", async () => {
  const html = await readFile(join("out", "presskit", "index.html"), "utf8");
  for (const heading of [
    "RELEASE",
    "TRAJETÓRIA",
    "PRÓXIMO LANÇAMENTO",
    "INTEGRANTES",
    "FOTOS",
    "LOGOS",
  ]) {
    assert.ok(html.includes(heading), `Missing presskit heading ${heading}`);
  }
  for (const name of memberNames) {
    assert.ok(html.includes(name), `Missing member ${name}`);
  }
  const links = [
    ...html.matchAll(/(?:src|href)="([^" ]*\/assets\/press\/[^"]+)"/g),
  ].map((match) => match[1]);
  assert.equal(new Set(links).size, pressFiles.length);
  for (const file of pressFiles) {
    assert.ok(
      links.includes(`${basePath}${file}`),
      `Missing presskit link ${file}`,
    );
    await access(join("out", file));
  }
});

test("Export declares an absolute Open Graph image", async () => {
  const html = await readFile(join("out", "index.html"), "utf8");
  const match = html.match(/<meta property="og:image" content="([^"]+)"/);
  assert.ok(match, "Missing og:image meta tag");
  const url = new URL(match[1]);
  assert.equal(url.protocol, "https:");
  assert.ok(url.pathname.startsWith(`${basePath}/`), url.pathname);
  const file = decodeURIComponent(url.pathname.slice(basePath.length));
  await access(join("out", file));
});

test("Template placeholder SVGs are gone", async () => {
  for (const file of removedSvgs) {
    await assert.rejects(
      access(join("out", file)),
      `${file} is still exported`,
    );
  }
});
