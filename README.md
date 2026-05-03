# IGE - Tarefas, Lembretes e Inventario

Aplicacao interna em Next.js para acompanhar tarefas, lembretes, calendario e operacoes de inventario.

## Modulos principais

- `Painel`: exibicao resumida com slides dos dados principais.
- `Tarefas`: cadastro e acompanhamento com prioridade e status.
- `Lembretes`: registro e organizacao de lembretes.
- `Calendario`: visualizacao dos eventos cadastrados.
- `Inventario`: cadastro de produtos, entrada e saida, leitura por codigo, busca por nome, impressao de etiqueta e exportacao.
- `Contagem`: captura de fotos para contagem assistida por IA e exportacao em Excel.

## Tecnologias

- Next.js
- React
- Supabase
- Tailwind CSS

## Variaveis de ambiente

Configure as variaveis abaixo em `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
```

Observacoes:

- `OPENAI_API_KEY` e usada apenas no servidor pela rota de analise de imagens.
- A tela de contagem por IA depende dessa chave para funcionar.

## Executar localmente

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Estrutura resumida

- `app/(admin)/`: paginas da area autenticada.
- `app/(admin)/api/analyze/route.js`: analise de imagens da tela de contagem.
- `components/inventory/`: componentes do modulo de inventario.
- `components/contagem/`: componentes da tela de contagem.
- `contexts/`: contexto de autenticacao e dados.
- `lib/`: clientes e utilitarios compartilhados.

## Observacoes

- A rota de contagem recebe imagens em base64 e retorna produtos consolidados com quantidade.
- A URL publica da rota continua sendo `/api/analyze`, mesmo estando organizada dentro de `app/(admin)/api`.
