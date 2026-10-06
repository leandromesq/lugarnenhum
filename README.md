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
- `src/components/ReleaseCarousel.tsx`: trilho contínuo dos CDs com seleção responsiva, perspectiva, teclado, gestos e lista de faixas expansível. A composição considera a altura disponível, mantendo metadados e controles livres da navegação em telas baixas.
- `src/components/MobiusModel.tsx`: modelo GLB preto na home com contorno branco via `OutlinePass`, carregamento sob demanda, giro inicial lento e fidget com arraste/toque, momentum e fricção. Hover não pausa; após 3s sem interação volta suavemente à pose e ao giro padrão. Setas giram e Escape para. Respeita movimento reduzido, sem botão. A dica temporária “Arraste para girar” desaparece após 5s ou ao interagir.
- `src/lib/mobius-physics.ts`: direção, velocidade de arraste e integração da inércia independente da taxa de quadros.
- `src/components/DiscFace.tsx`: logo, título e duração sobre os seis acabamentos iridescentes do Pencil; Inter Medium Italic hospedada localmente só nos rótulos.
- `src/components/BandPhoto.tsx`: fotografias distintas para desktop e celular.
- `src/components/AsciiOverlay.tsx`: ASCII interativo em Canvas, com fallback SVG, cache da cena estática e respeito a movimento reduzido.
- `src/lib/ascii-cycle.ts`: glitch localizado com mais símbolos, escolhas e intervalos independentes de 180–360ms, transições de 80ms e pausa entre transições.
- `src/lib/ascii-scene.ts`: coordenadas da foto original, projeção `cover` e lente radial. Foto e ASCII compartilham a escala e o recorte; não posicione os caracteres com unidades independentes de viewport.
- `src/components/Announcement.tsx`: faixa de anúncio com rolagem contínua e pausa somente ao passar o mouse, sem botão.
- `src/components/SiteFooter.tsx`: Instagram oficial e presskit, sem contatos inventados.
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

Para regenerar fotos, logos oficiais e favicon a partir do Pencil: os ícones preto e branco são arquivos distintos, sem inversão ou alteração das cores dos bonecos. A logo escrita original é preta; sua versão branca mantém o mesmo desenho e transparência. `prepare-brand-assets.mjs` usa os PNGs oficiais ao lado do `.pen`.

```sh
node scripts/prepare-design-assets.mjs "caminho/para/lugarnenhum-assets" "caminho/para/os/logos-oficiais"
```

As fontes são hospedadas localmente: Roboto Mono com licença em `src/app/fonts/LICENSE.txt`, e Inter nos rótulos dos CDs com licença em `src/app/fonts/Inter-LICENSE.txt`. A tipografia de interface usa Consolas com fallback para Courier New.

## Hospedagem

O build usa `output: "export"` e gera `out/`. No GitHub Actions, `basePath` e URLs de assets recebem `/lugarnenhum`. Fora dele, o site funciona na raiz do domínio. Nenhum domínio ou contato fictício foi configurado.
