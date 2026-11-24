<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Colaboração

Duas pessoas cuidam deste site:

- **Designer**: cria o visual no Figma. Não programa e não usa Git. Participa só pelo site do GitHub: abre issues pelo formulário e comenta nos pull requests. Usa o Claude Desktop como assistente.
- **Leandro** (`@leandromesq`): passa o design para o Pencil, programa, revisa e publica.

A conversa entre os dois, e entre os agentes de cada um, acontece em issues e comentários de PR. Escreva sempre para quem vai ler depois sem o contexto da sua sessão.

## Se você é o agente do designer

Seu papel é ajudar o designer a pedir mudanças e a revisar o resultado, em português simples e sem jargão técnico.

- **Pedir uma mudança:** ajude a escrever o texto da issue. O designer cola o texto no formulário "Mudança de design" e anexa os PNGs exportados do Figma. O link do formulário está em `design/COMO-PARTICIPAR.md`.
- **Revisar:** compare os screenshots do comentário automático do PR com os exports do Figma. Escreva um comentário curto com uma linha por diferença: página, desktop ou celular, o que aparece e o que deveria aparecer. Se estiver tudo certo, o comentário é "Aprovado".
- Nunca peça que o designer use terminal, Git, branches ou código, nem que edite arquivos do repositório.

## Se você é o agente do Leandro

### Fontes de verdade

1. **Figma** aprovado pelo designer: os exports e links na issue.
2. **`design/lugarnenhum.pen`**: a cópia do Figma no Pencil, versionada aqui. Leia pelo MCP do Pencil, nunca como texto. O MCP gratuito do Figma tem limites baixos, por isso o `.pen`.
3. **`DESIGN.md`** e **`PRODUCT.md`**: decisões que o design sozinho não mostra. Os tokens visuais ficam em `src/app/globals.css`.

Se o Figma, o `.pen` e o código discordarem, vence o Figma aprovado. Pergunte na issue em vez de escolher sozinho.

### Fluxo

1. Uma issue com a label `design` traz a mudança.
2. Atualize `design/lugarnenhum.pen` (e `design/assets/` quando houver imagens novas) num branch próprio.
3. Implemente no mesmo branch e abra um PR para o `dev` com `Closes #N`. Descreva a mudança visual em português simples, porque o designer também lê.
4. O workflow "Screenshots do PR" posta as imagens de todas as páginas no PR e menciona o designer.
5. Corrija o que o designer comentar. Faça o merge só depois do "Aprovado" dele quando o PR muda algo visual. O merge no `master` publica o site.

### Regras

- Trabalhe em branch e abra PR. Nunca faça push direto no `master` ou no `dev`.
- Não invente cores, textos, imagens ou contatos. Dúvida de design vai para a issue.
- Antes do PR, rode as verificações do `README.md` (`lint`, `typecheck`, `format:check`, `build`, `test`).
