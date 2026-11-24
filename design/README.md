# Design

O design do site nasce no Figma, ganha uma cópia no Pencil e só depois vira código. As regras de colaboração ficam no [`AGENTS.md`](../AGENTS.md).

## Figma

- Arquivo: _cole aqui o link do arquivo do Figma_
- Frames: PAGINA INICIAL, OUÇA NOSSA MUSICA, NOSSA LOJA, QUEM SOMOS e os frames CELULAR correspondentes.

## Pencil

- `lugarnenhum.pen`: a cópia do Figma que os agentes leem pelo MCP do Pencil.
- `assets/`: as imagens originais que o `.pen` usa e os logos oficiais. `scripts/prepare-design-assets.mjs` gera a partir delas as versões otimizadas de `public/assets/pencil/`:

```sh
node scripts/prepare-design-assets.mjs design/assets design/assets
```

## Pedir uma mudança

Abra uma issue com o template **Mudança de design**. Exporte os frames alterados como PNG pelo Figma (Export → PNG 1x ou 2x) e anexe à issue. Os exports não gastam a cota do MCP do Figma, e os agentes conseguem ver as imagens.
