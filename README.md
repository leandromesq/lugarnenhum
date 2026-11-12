# Lugar Nenhum

Site da banda, implementado a partir do documento `lugarnenhum.pen` no Pencil. Next.js App Router, React e TypeScript, com exportação estática para GitHub Pages.

## Desenvolvimento

```sh
npm ci
npm run dev
```

Páginas: `/`, `/musica/`, `/loja/`, `/quem-somos/` e `/presskit/`.

## Conteúdo e arquitetura

- `src/data/band.ts`: anúncio, biografia, navegação e lançamentos. Adicione `listenUrl` aos lançamentos quando os links oficiais estiverem disponíveis.
- `src/components/SiteShell.tsx`: estrutura compartilhada das páginas.
- `src/components/ReleaseCarousel.tsx`: carrossel de CDs 3D com seleção por botões, teclado, gestos e lista de faixas expansível, além de uma prévia de 15 s por faixa. A composição considera a altura disponível, mantendo metadados e controles livres da navegação em telas baixas.
- `src/components/MobiusModel.tsx`: modelo GLB preto na home com contorno branco via `OutlinePass`, carregamento sob demanda, giro inicial lento e fidget com arraste/toque, momentum e fricção. Hover não pausa; após 3s sem interação volta suavemente à pose e ao giro padrão. Setas giram e Escape para. Respeita movimento reduzido, sem botão. A dica temporária “Arraste para girar” desaparece após 5s ou ao interagir.
- `src/lib/mobius-physics.ts`: direção, velocidade de arraste e integração da inércia independente da taxa de quadros.
- `src/components/DiscStage.tsx`: um único modelo GLB compartilhado pelas seis instâncias 3D, cada uma com o rótulo impresso da faixa; céu visível e reflexos de manhã, dia, fim de tarde ou noite conforme o horário local ao abrir a página, giro durante a prévia e rótulo circular estático como fallback. Carrega só o céu do período atual, renderiza sob demanda e respeita movimento reduzido.
- `src/lib/disc-layout.ts`: posição, escala, inclinação e amortecimento dos discos no trilho.
- `src/components/BandPhoto.tsx`: fotografias distintas para desktop e celular.
- `src/components/AsciiOverlay.tsx`: ASCII interativo em Canvas, com fallback SVG, cache da cena estática e respeito a movimento reduzido.
- `src/lib/ascii-cycle.ts`: glitch localizado com mais símbolos, escolhas e intervalos independentes de 180–360ms, transições de 80ms e pausa entre transições.
- `src/lib/ascii-scene.ts`: coordenadas da foto original, projeção `cover` e lente radial. Foto e ASCII compartilham a escala e o recorte; não posicione os caracteres com unidades independentes de viewport.
- `src/components/Announcement.tsx`: faixa de anúncio com rolagem contínua e pausa somente ao passar o mouse, sem botão.
- `src/components/SiteFooter.tsx`: Instagram oficial e presskit, sem contatos inventados.
- `src/app/presskit/page.tsx`: presskit com release, trajetória, integrantes e downloads em JPG/PNG a partir de `src/data/band.ts` e `public/assets/press/`.
- `src/app/globals.css`: tokens e composição responsiva do design.
- `public/assets/pencil/`: fotos e logos otimizados em WebP.
- `PRODUCT.md` e `DESIGN.md`: referência de produto e identidade visual.
- `src/components/MemberWindows.tsx`: hotspots dos integrantes sobre a foto, projetados com a mesma transformação `cover`; abre uma janela no estilo do portfólio com nome, função e Instagram, uma por vez, e fecha com Escape, botão ou clique fora.

Música e loja são provisórias. Não há playback ou checkout simulados.

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

As fontes são hospedadas localmente: Roboto Mono com licença em `src/app/fonts/LICENSE.txt`. A Inter foi removida: os rótulos dos CDs agora são imagens fornecidas com o modelo. A tipografia de interface usa Consolas com fallback para Courier New.

## Hospedagem

O build usa `output: "export"` e gera `out/`. No GitHub Actions, `basePath` e URLs de assets recebem `/lugarnenhum`. Fora dele, o site funciona na raiz do domínio. Nenhum domínio ou contato fictício foi configurado.
