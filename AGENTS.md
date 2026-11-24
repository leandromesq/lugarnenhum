<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Colaboração

Duas pessoas trabalham neste site, cada uma com o próprio agente. Os agentes não conversam entre si diretamente: a conversa acontece em issues, pull requests e comentários deste repositório. Escreva sempre como se a outra pessoa e o agente dela fossem ler depois, sem o contexto da sua sessão.

## Papéis

- **Design** (o designer da banda): cria e altera o visual no Figma. É dono de `design/`, `DESIGN.md` e `PRODUCT.md`.
- **Código** (Leandro, `@leandromesq`): passa o design para o Pencil, implementa e publica. É dono do resto.

`.github/CODEOWNERS` registra essa divisão. Não altere arquivos do outro papel sem uma issue ou um comentário que peça a mudança.

## Fontes de verdade

1. **Figma**: onde o design nasce. Os links dos frames ficam em `design/README.md`.
2. **`design/lugarnenhum.pen`**: a cópia do design no Pencil, versionada aqui. É o que os agentes leem pelo MCP do Pencil, porque o MCP gratuito do Figma tem limites baixos. Só leia o `.pen` pelas ferramentas do Pencil, nunca como texto.
3. **`DESIGN.md`**: as decisões que o design sozinho não mostra (comportamentos, animações, pedidos do dono). Os tokens de cor e tipografia ficam em `src/app/globals.css`, e mudanças neles seguem o `DESIGN.md`.

Se o Figma, o `.pen` e o código discordarem, o Figma aprovado vence. Aponte a divergência na issue ou no PR em vez de escolher sozinho.

## Fluxo

1. **Mudança de design**: o designer abre uma issue com o template "Mudança de design", com os links dos frames do Figma, os PNGs exportados e o que mudou. Label `design`.
2. **Passagem para o Pencil**: o Leandro atualiza `design/lugarnenhum.pen` (e os assets em `design/assets/` quando mudarem) num branch próprio.
3. **Implementação**: no mesmo branch, o agente de código lê o `.pen` pelo MCP, implementa e abre um PR que fecha a issue (`Closes #N`).
4. **Revisão visual**: o workflow "Screenshots do PR" captura todas as páginas em desktop e celular e comenta no PR com o link. O designer (ou o agente dele) compara com o Figma e comenta o que estiver diferente, com página, viewport e o que deveria ser.
5. **Merge**: só depois da aprovação do designer quando o PR muda algo visual. O merge no `master` publica no GitHub Pages.

## Regras para os agentes

- Trabalhe num branch e abra PR. Nunca faça push direto no `master` ou no `dev`.
- Um PR por issue ou mudança coerente. Descreva o que mudou visualmente e o que ficou de fora.
- Ao comentar numa issue ou PR, diga de que papel você fala (design ou código) e o que precisa da outra pessoa, se precisar.
- Dúvida de design se resolve na issue, com o designer. Não invente cores, textos, imagens ou contatos.
- Antes de abrir o PR, rode as verificações do `README.md` (`lint`, `typecheck`, `format:check`, `build`, `test`).
