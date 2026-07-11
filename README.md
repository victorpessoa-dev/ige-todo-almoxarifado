# IGE - Sistema Interno de Operacoes

Sistema interno da IGE / Supergesso para apoiar a rotina administrativa, operacional e de almoxarifado em um unico ambiente.

O projeto centraliza tarefas, lembretes, solicitacoes de compra, controle de estoque, catalogo de materiais, contagem fisica e acompanhamento de giro. A proposta e reduzir controles paralelos, melhorar a visibilidade das demandas e facilitar o acompanhamento dos materiais usados no dia a dia.

## Visao geral

O sistema atende dois fluxos principais:

- uma area publica para abertura e acompanhamento de pedidos de compra;
- uma area interna para gestao administrativa, compras, estoque e atividades operacionais.

A experiencia foi pensada para uso diario por equipes internas, com telas objetivas, navegacao simples e foco em acompanhamento rapido das informacoes mais importantes.

## Principais recursos

- abertura publica de solicitacoes de compra;
- acompanhamento de pedidos por codigo;
- painel interno com indicadores operacionais;
- gestao de tarefas e lembretes;
- calendario integrado para atividades;
- controle de produtos do almoxarifado;
- registro de entradas e saidas de estoque;
- identificacao por codigo e codigo de barras;
- impressao de etiquetas;
- importacao e exportacao de dados;
- catalogo de materiais para consulta;
- contagem fisica de estoque por imagens;
- analise de giro de produtos;
- acompanhamento de compras por status;
- cadastro de solicitantes e centros de custo;
- suporte a uso em computadores e dispositivos moveis.

## Area publica

A area publica permite que colaboradores criem solicitacoes de compra sem precisar acessar a area administrativa.

Cada solicitacao recebe um codigo de acompanhamento. Com esse codigo, o solicitante pode consultar o andamento do pedido de forma limitada e segura.

Tambem existe uma lista publica resumida com itens ja aceitos pelo administrativo, ajudando a evitar pedidos duplicados e dando mais transparencia sobre o que ja esta em andamento.

## Area administrativa

A area administrativa concentra o controle interno do sistema.

Nela, a equipe pode acompanhar solicitacoes, atualizar status, registrar valores, vincular pedidos a produtos do estoque, transformar compras recebidas em entrada de almoxarifado e manter os cadastros auxiliares atualizados.

O painel tambem apresenta uma visao rapida de tarefas pendentes, lembretes, calendario, produtos com estoque baixo e compras que precisam de atencao.

## Almoxarifado

O modulo de almoxarifado permite controlar produtos, estoque minimo, estoque maximo, entradas, saidas, etiquetas, importacoes, exportacoes e lista de compra para reposicao.

O objetivo e manter o estoque mais organizado, reduzir esquecimentos de reposicao e facilitar a localizacao de materiais por codigo, nome ou codigo de barras.

## Compras

O modulo de compras acompanha o ciclo da solicitacao desde a criacao ate a conclusao.

Ele permite controlar prioridade, centro de custo, solicitante, previsao de entrega, fornecedor, valores e situacao operacional.

O fluxo de status padrao e: Nova, Em cotacao, Preparando pedido, Aguardando aprovacao, Aguardando pagamento, Transporte, Disponivel para retirada e Concluida. Quando necessario, a solicitacao tambem pode ser marcada como Cancelada.

## Contagem e giro

O sistema tambem auxilia na contagem fisica de estoque por imagens e na analise de giro dos produtos.

Esses recursos ajudam a comparar o estoque cadastrado com a contagem real, identificar divergencias, entender quais produtos tem maior ou menor saida e apoiar decisoes de reposicao.

## Seguranca e acesso

O acesso administrativo e restrito a usuarios autorizados.

As informacoes publicas sao limitadas ao necessario para abertura e acompanhamento de solicitacoes. Dados internos de estoque, compras, tarefas e movimentacoes ficam reservados para a area autenticada.

## Objetivo do projeto

O objetivo principal e oferecer uma ferramenta simples, centralizada e confiavel para a operacao da IGE / Supergesso.

O sistema busca melhorar a organizacao interna, reduzir retrabalho, facilitar auditorias, dar mais clareza aos pedidos de compra e manter o almoxarifado mais previsivel.

## Documentacao tecnica

A documentacao tecnica e as decisoes da auditoria ficam em:

```txt
docs/technical-audit.md
```

Esse arquivo concentra observacoes internas sobre seguranca, arquitetura, versionamento, banco de dados e proximas melhorias tecnicas.
