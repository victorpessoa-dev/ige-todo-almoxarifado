# Checklist de validacao no navegador

Use este roteiro depois de rodar `npm run build` e subir o app local ou em homologacao.

## Fluxos principais

- Abrir `/` e confirmar redirecionamento/entrada publica.
- Abrir `/login`, navegar por teclado ate email, senha, botao de ver senha e botao de entrar.
- Abrir `/solicitar`, criar uma solicitacao publica e confirmar codigo gerado.
- Em `/solicitar`, consultar uma solicitacao por codigo.
- Em `/solicitar`, abrir e fechar detalhes com mouse, Enter, Espaco e Escape.
- Abrir `/catalogo-publico`, filtrar por texto, categoria e marca.
- Entrar na area administrativa e conferir painel, solicitacoes, inventario, catalogo, calendario, tarefas e lembretes.
- No inventario, testar cadastro, edicao, movimentacao, impressao de etiqueta, importacao/exportacao e scanner quando houver camera disponivel.

## Teclado e foco

- A ordem de Tab deve seguir a leitura visual da tela.
- Todo dialog deve receber foco ao abrir e devolver foco ao elemento de origem ao fechar.
- Escape deve fechar dialogs, menus, selects e popovers.
- Botoes iconicos devem ter nome acessivel.
- Tabelas com ordenacao devem anunciar estado ascendente/descendente.
- Paginacao deve permitir troca de pagina e tamanho via teclado.
- Filtros devem ser alcançaveis por teclado e nao devem prender foco.

## Responsividade

- Conferir larguras pequenas: 360px, 390px e 430px.
- Conferir tablet: 768px e 1024px.
- Conferir desktop amplo: 1440px e ultrawide.
- Nao deve haver texto sobreposto, botao cortado ou rolagem horizontal inesperada.

## PWA e permissao

- Confirmar carregamento de `manifest.json`.
- Confirmar registro do service worker.
- Scanner deve pedir permissao de camera somente quando usado.
- Negar camera deve mostrar fallback/erro compreensivel.

## Seguranca visual

- Catalogo publico nao deve mostrar estoque atual.
- Area publica nao deve exibir dados internos de compra, valor, usuario ou produto interno.
- Usuario sem login nao deve acessar telas administrativas.
