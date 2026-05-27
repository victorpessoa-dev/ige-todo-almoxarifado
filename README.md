# IGE - Tarefas, Lembretes e Almoxarifado

Sistema interno em Next.js para organizar tarefas, lembretes, calendario, inventario, contagem de estoque por imagem e analise de giro de produtos.

## Tecnologias

- Next.js 16 com App Router
- React 19
- Supabase Auth, Database e Realtime
- Tailwind CSS
- shadcn/ui e Radix UI
- FullCalendar
- Recharts
- XLSX
- Gemini/Mistral para rotas de IA no servidor

## Como executar

```bash
npm install
npm run dev
```

Para gerar build de producao:

```bash
npm run build
npm run start
```

## Variaveis de ambiente

Crie um arquivo `.env.local` com as credenciais usadas pela aplicacao:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

GEMINI_API_KEYS=
GEMINI_API_KEY_1=
GEMINI_API_KEY_2=
MISTRAL_API_KEY=
```

Observacoes:

- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` conectam o frontend ao Supabase.
- As chaves de Gemini e Mistral sao usadas apenas no servidor, pelas rotas de analise com IA.
- `GEMINI_API_KEYS` aceita varias chaves separadas por virgula. Tambem e possivel usar `GEMINI_API_KEY_1` e `GEMINI_API_KEY_2`.
- Se a IA externa falhar na analise de giro, a rota tenta retornar uma analise local baseada nas movimentacoes.

## Estrutura do projeto

```txt
app/
  page.js                         Tela de login
  layout.js                       Providers globais, tema e toaster
  not-found.js                    Pagina 404
  globals.css                     Estilos globais
  (admin)/
    layout.js                     Layout autenticado com sidebar
    painel/page.js                Painel com slides
    tarefas/page.js               CRUD de tarefas
    lembretes/page.js             CRUD de lembretes
    calendario/page.js            Calendario de tarefas e lembretes
    inventario/page.js            Gestao de produtos e estoque
    solicitacoes/page.js          Controle interno de compras
    contagem/page.js              Contagem de estoque por fotos
    analise-giro/page.js          Indicadores e analise de giro
    api/
      analyze/route.js            IA para contagem por imagens
      inventory-scan-assist/route.js
                                      IA para auxiliar leitura de produto por imagem
      inventory-turnover-analysis/route.js
                                      IA e fallback local para analise de giro

components/
  sidebar.js                      Menu lateral da area admin
  events/                         Formulario compartilhado de tarefas/lembretes
  inventory/                      Componentes do modulo de inventario
  solicitacoes/                   Componentes do modulo de compras
  contagem/                       Camera, galeria e lista de produtos contados
  slides/                         Slides do painel
  ui/                             Componentes de interface

contexts/
  auth-context.js                 Login, logout e sessao Supabase
  data-context.js                 Estado global, CRUD e realtime dos dados

lib/
  supabaseClient.js               Cliente Supabase
  excel.js                        Geracao/download de Excel
  user-messages.js                Mensagens amigaveis de erro
  server/ai-providers.js          Integracao com Gemini e Mistral

constants/
  task-config.js                  Status, prioridades e ordenacao
  solicitacoes-config.js          Status e prioridades de compras

database/
  solicitacoes_compra.sql         SQL das tabelas de compras, trigger de codigo e RLS

public/
  ige-supergesso.png              Logo usada no login e sidebar
```

## Paginas e funcionalidades

### `/`

Redireciona para `/solicitar`, que e a entrada principal publica do sistema.

### `/login`

Tela de login do sistema. Usa Supabase Auth com email e senha. Quando o usuario ja esta autenticado, redireciona para `/painel`.

### `/solicitar`

Pagina principal publica para criacao e acompanhamento de solicitacoes de compra sem login.

A primeira tela mostra uma lista limitada dos produtos solicitados que ja foram aceitos pelo administrativo e seus status de andamento. O formulario de criacao fica em um dialog aberto pelo botao `Fazer pedido`. Tambem ha um botao `Acesso admin` para entrar na area interna.

Campos principais:

- descricao do item;
- quantidade;
- prioridade;
- previsao desejada;
- centro de custo selecionado em lista;
- aplicacoes especificas;
- link de referencia ou imagem;
- solicitante selecionado em lista.

A pagina carrega apenas solicitantes e centros de custo ativos. Ao enviar, a solicitacao e criada por RPC segura e retorna um codigo numerico como `000001` para acompanhamento. Tambem existe uma consulta publica por codigo e uma lista publica limitada que mostram apenas dados de andamento.

A seguranca depende da RLS e das funcoes SQL: usuarios anonimos podem ler apenas os cadastros ativos de `solicitantes_compra` e `centros_custo`, podem criar solicitacoes e podem consultar andamento por codigo via RPC, sem permissao de leitura direta, atualizacao ou exclusao das solicitacoes.

A situacao exibida segue a regra operacional usada na planilha: cotacao nao iniciada, cotando, pedido em analise, aguardando pagamento, preparando pedido, disponivel para retirada, sem data de entrega, no prazo, atrasada, para chegar hoje ou entregue e conferido.

### `/painel`

Painel visual com slides automaticos:

- tarefas pendentes;
- lembretes pendentes;
- calendario;
- produtos com estoque baixo;
- solicitacoes de compra urgentes ou atrasadas;
- relogio local com indicador de aberto/fechado.

Tambem possui modo tela cheia e navegacao por setas do teclado.

### `/tarefas`

Pagina para criar, editar, concluir, reabrir e excluir tarefas.

Campos principais:

- titulo;
- descricao;
- responsavel;
- data;
- prioridade;
- status.

As tarefas sao separadas entre pendentes e concluidas, agrupadas por data de criacao e ordenadas por prioridade.

### `/lembretes`

Pagina para criar, editar, concluir, reabrir e excluir lembretes.

Campos principais:

- titulo;
- conteudo;
- destinatario;
- data;
- prioridade;
- status.

Segue uma organizacao parecida com tarefas, separando lembretes pendentes e concluidos.

### `/calendario`

Calendario mensal com FullCalendar. Mostra tarefas e lembretes ainda nao concluidos que possuem data.

Funcionalidades:

- clicar em um dia para criar tarefa ou lembrete;
- clicar em um evento para editar;
- excluir evento pelo formulario;
- cores diferentes para tarefas e lembretes.

### `/inventario`

Modulo principal de almoxarifado.

Funcionalidades:

- cadastrar produtos;
- editar produtos;
- excluir produtos;
- selecionar varios produtos;
- excluir produtos em lote;
- dar baixa em lote;
- registrar entrada e saida de estoque;
- impedir saida maior que o estoque disponivel;
- buscar produto por codigo ou codigo de barras;
- usar scanner/campo de codigo para baixa rapida;
- imprimir etiquetas;
- exportar CSV;
- exportar XLSX;
- importar produtos de arquivo `.csv` ou `.xlsx`;
- somar estoque ao importar produto com codigo ja existente;
- gerar lista de compra para produtos abaixo do minimo.

Campos do produto:

- codigo;
- nome;
- codigo de barras;
- estoque;
- minimo;
- maximo.

### `/solicitacoes`

Area administrativa autenticada para controle interno das compras.

Funcionalidades:

- listar solicitacoes em uma tabela;
- pesquisar por codigo, item, solicitante ou centro de custo;
- filtrar por status geral e prioridade;
- visualizar indicadores de total, abertas, urgentes, atrasadas e valor em aberto;
- editar dados da solicitacao;
- atualizar status geral, cotacao, pedido e transporte;
- informar valor unitario, valor total, previsao de entrega, pedido e nota fiscal;
- abrir link de referencia ou imagem anexado pelo solicitante;
- cadastrar, editar, ativar/inativar e excluir solicitantes;
- cadastrar, editar, ativar/inativar e excluir centros de custo;
- vincular a solicitacao a um produto do inventario;
- executar acoes rapidas como gerar pedido, marcar entregue, concluir e cancelar;
- transformar solicitacao vinculada em entrada de estoque.

O modulo segue o mesmo padrao do restante do sistema, usando componentes em `components/solicitacoes`, servico em `lib/solicitacoes-service.js` e realtime pelo `DataProvider`.

### `/contagem`

Tela para contagem fisica de estoque com fotos.

Funcionalidades:

- abrir camera;
- adicionar imagens do dispositivo;
- limitar a ate 3 imagens por analise;
- enviar imagens para `/api/analyze`;
- receber produtos e quantidades identificados por IA;
- consolidar produtos repetidos;
- comparar a contagem fisica com o estoque cadastrado;
- editar quantidades manualmente;
- remover itens da lista;
- exportar a contagem em Excel.

### `/analise-giro`

Pagina de acompanhamento de giro de estoque.

Funcionalidades:

- escolher periodo de analise: 2 semanas, 1 mes, 2 meses, 3 meses, 6 meses, 1 ano ou 2 anos;
- ver resumo de produtos avaliados;
- classificar produtos com giro alto, medio ou baixo;
- visualizar grafico geral de entradas e saidas;
- buscar produto por nome ou codigo;
- paginar lista de produtos;
- selecionar ate 5 produtos para analise por IA;
- ver historico individual de entrada, saida, media mensal e dias sem saida;
- receber sugestoes de minimo, maximo e recomendacoes.

## APIs internas

### `POST /api/analyze`

Recebe ate 3 imagens em base64 e retorna uma lista consolidada de produtos identificados.

Formato esperado:

```json
{
  "images": ["data:image/jpeg;base64,..."]
}
```

Resposta:

```json
{
  "products": [
    { "name": "Produto", "quantity": 1 }
  ]
}
```

### `POST /api/inventory-scan-assist`

Recebe uma imagem e uma lista de produtos do catalogo. Tenta identificar codigo, nome e produto correspondente.

Resposta:

```json
{
  "match": null,
  "suggestion": {
    "code": "",
    "productName": "",
    "confidence": 0.8
  }
}
```

### `POST /api/inventory-turnover-analysis`

Recebe dados de giro de ate 5 produtos e retorna resumo e recomendacoes. Caso a IA falhe, gera uma resposta local com base nos dados enviados.

## Database

O projeto usa Supabase como banco e autenticacao. As operacoes principais aparecem em `contexts/data-context.js` e nos componentes de inventario.

### Auth

O login usa `supabase.auth.signInWithPassword`. Os registros criados recebem `user_id` com o ID do usuario autenticado.

### Tabela `tarefas`

Usada nas paginas de tarefas, calendario e painel.

Campos usados pela aplicacao:

- `id`
- `user_id`
- `titulo`
- `descricao`
- `responsavel`
- `status`
- `prioridade`
- `data`
- `created_at`

Valores esperados de `status`:

- `a_fazer`
- `em_andamento`
- `concluido`

Valores esperados de `prioridade`:

- `urgente`
- `alto`
- `medio`
- `baixo`

### Tabela `lembretes`

Usada nas paginas de lembretes, calendario e painel.

Campos usados pela aplicacao:

- `id`
- `user_id`
- `titulo`
- `conteudo`
- `destinatario`
- `status`
- `prioridade`
- `data`
- `created_at`

Usa os mesmos valores de `status` e `prioridade` de tarefas.

### Tabela `produtos`

Usada no inventario, contagem, painel e analise de giro.

Campos usados pela aplicacao:

- `id`
- `user_id`
- `cod`
- `nome`
- `cod_barra`
- `estoque`
- `min`
- `max`
- `created_at`

Regras importantes no codigo:

- `cod` e `nome` sao obrigatorios no cadastro;
- `cod_barra` normalmente recebe o mesmo valor de `cod`;
- o inventario verifica codigo duplicado antes de criar ou editar;
- entradas e saidas atualizam o campo `estoque`;
- produtos com `estoque <= min` aparecem como estoque baixo.

### Tabela `movimentacoes_estoque`

Registra entradas e saidas de produtos.

Campos usados pela aplicacao:

- `id`
- `user_id`
- `produto_id`
- `tipo`
- `quantidade`
- `motivo`
- `created_at`

Valores esperados de `tipo`:

- `entrada`
- `saida`

Relacionamento:

- `movimentacoes_estoque.produto_id` referencia `produtos.id`.

A aplicacao consulta movimentacoes com join em `produtos` para exibir nome e codigo do produto relacionado.

### Tabela `solicitacoes_compra`

Usada no formulario publico `/solicitar`, na area admin `/solicitacoes` e no slide de compras do painel.

Campos usados pela aplicacao:

- `id`
- `codigo`
- `user_id`
- `produto_id`
- `solicitante_id`
- `centro_custo_id`
- `descricao`
- `quantidade`
- `prioridade`
- `status_geral`
- `status_cotacao`
- `status_pedido`
- `status_transporte`
- `valor_unitario`
- `valor_total`
- `data_solicitacao`
- `previsao_desejada`
- `previsao_entrega`
- `solicitante`
- `centro_custo`
- `pedido`
- `nota_fiscal`
- `aplicacoes`
- `link_referencia`
- `created_at`
- `updated_at`

Relacionamentos:

- `solicitante_id` referencia `solicitantes_compra.id`;
- `centro_custo_id` referencia `centros_custo.id`;
- `produto_id` referencia `produtos.id`.

Mesmo usando IDs, os campos de texto `solicitante` e `centro_custo` continuam salvos na solicitacao para manter historico e facilitar busca.

Valores esperados de `prioridade`:

- `baixa`
- `media`
- `alta`
- `urgente`

Valores esperados de `status_geral`:

- `nova`
- `aceita`
- `em_cotacao`
- `aprovacao`
- `preparando_pedido`
- `em_transporte`
- `entregue`
- `concluida`
- `cancelada`

Valores esperados de `status_cotacao`:

- `nao_iniciado`
- `cotando`
- `cotacao_em_analise`
- `cotacao_finalizada`
- `cotacao_aprovada`
- `adiada`
- `cancelada`
- `outra`

Valores esperados de `status_pedido`:

- `nao_digitado`
- `pedido_digitado`
- `pedido_em_analise`
- `pedido_encerrado`
- `pedido_aprovado`
- `pedido_adiado`
- `aguardando_pagamento`
- `outra`
- `preparando_pedido`

Valores esperados de `status_transporte`:

- `producao_separacao`
- `disponivel_retirada`
- `transporte`
- `entregue`
- `entrega_atrasada`
- `entregue_conferido`
- `cancelada`
- `adiada`
- `outra`

Para criar a tabela com RLS, rode no SQL Editor do Supabase o arquivo:

```txt
database/solicitacoes_compra.sql
```

Politicas criadas:

- `anon` e `authenticated` podem fazer apenas `INSERT` publico;
- somente `authenticated` pode fazer `SELECT`, `UPDATE` e `DELETE`;
- usuarios anonimos nao conseguem fazer `SELECT` direto em solicitacoes cadastradas.

O arquivo tambem cria:

- trigger para gerar codigos numericos como `000001`;
- funcao `criar_solicitacao_compra_publica` para criar solicitacao publica e retornar o codigo;
- funcao `buscar_solicitacao_compra_publica` para consultar andamento por codigo com retorno limitado;
- funcao `listar_solicitacoes_compra_publica` para listar os ultimos produtos aceitos com dados limitados de status;
- migracao de valores antigos de status para os novos status de cotacao, pedido e entrega.

### Tabela `solicitantes_compra`

Cadastro administrado em `/solicitacoes`, usado como lista no formulario publico.

Campos principais:

- `id`
- `nome`
- `centro_custo_id`
- `ativo`
- `created_at`
- `updated_at`

Usuarios anonimos podem ler somente registros com `ativo = true`. Usuarios autenticados podem listar, criar, editar e excluir.

### Tabela `centros_custo`

Cadastro administrado em `/solicitacoes`, usado como lista no formulario publico.

Campos principais:

- `id`
- `nome`
- `codigo`
- `ativo`
- `created_at`
- `updated_at`

Usuarios anonimos podem ler somente registros com `ativo = true`. Usuarios autenticados podem listar, criar, editar e excluir.

## Realtime e sincronizacao

O `DataProvider` carrega os dados iniciais e assina eventos realtime do Supabase nas tabelas:

- `tarefas`
- `lembretes`
- `produtos`
- `movimentacoes_estoque`
- `solicitacoes_compra`
- `solicitantes_compra`
- `centros_custo`

Quando ha insert, update ou delete, o estado da aplicacao e atualizado automaticamente. O app tambem recarrega dados quando a aba volta a ficar visivel ou quando a conexao volta ao modo online.

## Observacoes de desenvolvimento

- As rotas dentro de `app/(admin)/api` continuam publicadas como `/api/...`, porque `(admin)` e um route group do Next.js.
- O projeto possui `package-lock.json` e `pnpm-lock.yaml`; escolha um gerenciador de pacotes para evitar divergencia de lockfile.
- Alguns textos do codigo estao sem acentuacao ou com caracteres quebrados. O README segue texto sem acentos para manter consistencia com o padrao atual dos arquivos.
