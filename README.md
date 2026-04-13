# IGE - Tarefas e Lembretes

Um sistema completo de gerenciamento de tarefas, lembretes e inventário.

## Funcionalidades

- ✅ Gerenciamento de tarefas com prioridades e status
- ✅ Sistema de lembretes
- ✅ Calendário integrado
- ✅ Painel com slides automáticos
- ✅ **NOVO:** Notificações de tarefas do dia
- ✅ **NOVO:** Sistema de inventário com controle de estoque
- ✅ **NOVO:** Alertas de produtos com estoque baixo
- ✅ **NOVO:** Leitor de código de barras
- ✅ **NOVO:** Impressão de etiquetas com códigos de barras
- ✅ **NOVO:** Histórico de movimentações de estoque

## Funcionalidades do Inventário

### Cadastro de Produtos
- Código manual do produto
- Código de barras (pode ser digitado ou escaneado)
- Nome do produto
- Estoque mínimo e máximo
- Controle de quantidade atual

### Movimentação de Estoque
- Entrada de produtos
- Saída de produtos
- Histórico completo de todas as movimentações
- Registro automático de data e hora

### Leitor de Código de Barras
- Campo dedicado para leitura de códigos
- Suporte a leitores USB de código de barras
- Busca automática de produtos por código

### Impressão de Etiquetas
- Design profissional com logo da empresa
- Código de barras gerado automaticamente
- Informações do produto (nome, código)
- Otimizado para impressoras térmicas

## Funcionalidades do Painel de Slides

O painel de slides é otimizado para telas de exibição pública e rotação automática:

- **Tarefas**: Mostra tarefas pendentes organizadas por prioridade
- **Lembretes**: Exibe lembretes ativos
- **Calendário**: Visual completo do mês com eventos (FullCalendar) - **SOMENTE VISUAL, sem ações de navegação ou seleção**
- **Notificações**: Alertas de tarefas do dia e atrasadas
- **Inventário**: Produtos com estoque baixo
- **Relógio**: Horário local com status de funcionamento

**Nota**: O slide de calendário usa o mesmo componente FullCalendar da página de calendário, mas com todas as interações desabilitadas para uso em telas de exibição.

## Configuração do Banco de Dados

### Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute o SQL completo do arquivo `database/produtos.sql` no SQL Editor do Supabase
3. Configure as variáveis de ambiente no `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Tabelas Criadas

O script cria automaticamente todas as tabelas necessárias:
- `tarefas` - Gerenciamento de tarefas
- `lembretes` - Sistema de lembretes
- `produtos` - Cadastro de produtos do inventário
- `movimentacoes_estoque` - Histórico de movimentações

## Instalação

```bash
npm install
# ou
pnpm install
```

## Executar

```bash
npm run dev
# ou
pnpm dev
```

## Build

```bash
npm run build
# ou
pnpm build
```

## Estrutura do Projeto

- `app/(admin)/` - Páginas administrativas
  - `painel/` - Painel com slides
  - `tarefas/` - Gerenciamento de tarefas
  - `lembretes/` - Gerenciamento de lembretes
  - `calendario/` - Calendário
  - `inventario/` - **NOVO:** Sistema de inventário
  - `not-found.js` - Página 404 personalizada
- `components/slides/` - Componentes dos slides
  - `TarefasSlide.js`
  - `LembretesSlide.js`
  - `CalendarioSlide.js`
  - `NotificacoesSlide.js` - **NOVO:** Slide de notificações
  - `InventarioSlide.js` - **NOVO:** Slide de inventário
- `contexts/data-context.js` - Contexto de dados (atualizado com produtos e movimentações)
- `database/produtos.sql` - **NOVO:** Script SQL completo para todas as tabelas