# Design

O design do site nasce no Figma, ganha uma cópia no Pencil e só depois vira código. O guia do designer é o [`COMO-PARTICIPAR.md`](COMO-PARTICIPAR.md), e as regras para os agentes ficam no [`AGENTS.md`](../AGENTS.md).

## Figma

- Arquivo: _cole aqui o link do arquivo do Figma_
- Frames: PAGINA INICIAL, OUÇA NOSSA MUSICA, NOSSA LOJA, QUEM SOMOS e os frames CELULAR correspondentes.

## Pencil

- `lugarnenhum.pen`: a cópia do Figma que os agentes leem pelo MCP do Pencil.
- `assets/`: as imagens originais que o `.pen` usa e os logos oficiais. `scripts/prepare-design-assets.mjs` gera a partir delas as versões otimizadas de `public/assets/pencil/`:

```sh
node scripts/prepare-design-assets.mjs design/assets design/assets
```

## Por que exports e não o MCP do Figma

O designer anexa os frames exportados em PNG às issues. Os exports não gastam a cota do MCP gratuito do Figma, e qualquer agente consegue ver as imagens. O Leandro passa o design para o `.pen`, que os agentes leem pelo MCP do Pencil.
