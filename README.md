# Lugar Nenhum

Site da banda, implementado a partir do documento `lugarnenhum.pen` no Pencil. Next.js App Router, React e TypeScript, com exportação estática para GitHub Pages.

## Desenvolvimento

```sh
npm ci
npm run dev
```

Páginas: `/`, `/musica/`, `/loja/`, `/quem-somos/` e `/presskit/`.

## Conteúdo e arquitetura

- `src/data/band.ts`: anúncio, biografia provisória, navegação e lançamentos. Adicione `listenUrl` aos lançamentos quando os links oficiais estiverem disponíveis.
- `src/components/SiteShell.tsx`: estrutura compartilhada das páginas.
- `src/components/ReleaseCarousel.tsx`: interação dos CDs, com teclado e gestos.
- `src/components/BandPhoto.tsx`: fotografias distintas para desktop e celular.
- `src/components/AsciiOverlay.tsx`: ASCII interativo em Canvas, com fallback SVG, cache da cena estática e respeito a movimento reduzido.
- `src/lib/ascii-scene.ts`: coordenadas da foto original, projeção `cover` e lente radial. Foto e ASCII compartilham a escala e o recorte; não posicione os caracteres com unidades independentes de viewport.
- `src/components/Announcement.tsx`: faixa de anúncio com rolagem contínua e controle de pausa.
- `src/app/globals.css`: tokens e composição responsiva do design.
- `public/assets/pencil/`: fotos e logos otimizados em WebP.
- `PRODUCT.md` e `DESIGN.md`: referência de produto e identidade visual.

Música e loja são provisórias. A biografia mantém Lorem ipsum por decisão do proprietário. Não há playback ou checkout simulados.

## Validação

```sh
npm run lint
npm run typecheck
npm run format:check
npm run build
npm run test
npx playwright install chromium
npm run test:browser
```

`test` valida a exportação já construída em `out/`. `test:browser` verifica desktop e celular, navegação, carregamento das imagens, teclado e carrossel; inicia um servidor em `127.0.0.1:3001` se necessário.

`npm run format` aplica a formatação. O workflow de deploy verifica código e exportação antes de publicar.

## Assets do design

Para regenerar WebP e ícones a partir dos arquivos de imagem exportados pelo Pencil:

```sh
node scripts/prepare-design-assets.mjs "caminho/para/lugarnenhum-assets"
```

A fonte Roboto Mono é hospedada localmente, com sua licença em `src/app/fonts/LICENSE.txt`. A tipografia de interface usa Consolas com fallback para Courier New.

## Hospedagem

O build usa `output: "export"` e gera `out/`. No GitHub Actions, `basePath` e URLs de assets recebem `/lugarnenhum`. Fora dele, o site funciona na raiz do domínio. Nenhum domínio ou contato fictício foi configurado.
