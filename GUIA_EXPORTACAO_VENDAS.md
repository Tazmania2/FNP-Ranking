# Guia de Exportação de Vendas Diárias

## Opções Disponíveis

Você tem **2 formas** de exportar vendas:

### 📋 Opção 1: Queries Diretas (Mais Simples)
Use o arquivo `EXPORT_DAILY_SALES.sql` - copie e cole direto no Supabase Studio

### 🔧 Opção 2: Funções SQL (Mais Flexível)
Instale as funções com `CREATE_SALES_EXPORT_FUNCTION.sql`, depois use comandos simples

---

## 🚀 Opção 1: Queries Diretas (Recomendado para começar)

### Passo a Passo:

1. Abra o Supabase Studio SQL Editor
2. Abra o arquivo `EXPORT_DAILY_SALES.sql`
3. Escolha UMA das 8 queries disponíveis:

#### Query 1: Todas as Vendas (Detalhadas)
```sql
-- Copia do arquivo: OPÇÃO 1
-- Mostra TODAS as vendas com TODOS os detalhes
```
**Use quando:** Precisa de um relatório completo de vendas

#### Query 2: Resumo por Data
```sql
-- Copia do arquivo: OPÇÃO 2
-- Totais agrupados por dia
```
**Use quando:** Quer ver totais diários

#### Query 3: Ranking de Vendedores
```sql
-- Copia do arquivo: OPÇÃO 3
-- Performance de cada vendedor
```
**Use quando:** Quer ver quem vendeu mais

#### Query 4: Período Específico
```sql
-- Copia do arquivo: OPÇÃO 4
-- Precisa EDITAR as datas: '2026-06-01' e '2026-06-30'
```
**Use quando:** Precisa de um mês ou período específico

#### Query 5: Mês Atual (Automática)
```sql
-- Copia do arquivo: OPÇÃO 5
-- Pega automaticamente o mês atual
```
**Use quando:** Quer o mês atual sem editar datas

#### Query 6: Vendas de Hoje
```sql
-- Copia do arquivo: OPÇÃO 6
-- Apenas vendas de hoje
```
**Use quando:** Relatório diário

#### Query 7: Por Dia da Semana
```sql
-- Copia do arquivo: OPÇÃO 7
-- Análise de padrão: qual dia vende mais?
```
**Use quando:** Quer análise de comportamento

#### Query 8: Top Produtos
```sql
-- Copia do arquivo: OPÇÃO 8
-- Produtos/entregas mais vendidos
```
**Use quando:** Quer saber o que vende mais

### Como Exportar os Resultados:

1. Execute a query no Supabase Studio
2. Aguarde os resultados aparecerem
3. Clique no botão **"Export"** no canto superior direito
4. Escolha o formato:
   - **CSV** → para abrir no Excel
   - **JSON** → para usar em código
   - **Copy** → para colar em outro lugar

---

## 🔧 Opção 2: Funções SQL (Mais Avançado)

### Instalação (Uma vez só):

1. Abra o Supabase Studio SQL Editor
2. Copie e cole TODO o conteúdo de `CREATE_SALES_EXPORT_FUNCTION.sql`
3. Execute (Run)
4. Deve aparecer: "Funções de exportação criadas com sucesso!"

### Depois de Instalar, Use Assim:

#### Exportar Vendas do Mês Atual
```sql
SELECT * FROM export_sales();
```

#### Exportar Vendas de Junho 2026
```sql
SELECT * FROM export_sales('2026-06-01'::DATE, '2026-06-30'::DATE);
```

#### Exportar Vendas de um Vendedor Específico
```sql
SELECT * FROM export_sales('2026-06-01'::DATE, '2026-06-30'::DATE, 'CODIGO_VENDEDOR');
```

#### Resumo Diário do Mês
```sql
SELECT * FROM sales_daily_summary();
```

#### Ranking Top 20 Vendedores
```sql
SELECT * FROM sales_ranking(NULL, NULL, 20);
```

#### Vendas de Hoje
```sql
SELECT * FROM export_sales(CURRENT_DATE, CURRENT_DATE);
```

#### Vendas de Ontem
```sql
SELECT * FROM export_sales(CURRENT_DATE - 1, CURRENT_DATE - 1);
```

---

## 📊 Colunas Exportadas

Quando você exporta vendas, recebe estas colunas:

| Coluna | Descrição | Exemplo |
|--------|-----------|---------|
| `data_hora_venda` | Data e hora completa | 2026-06-12 14:30:15 |
| `data_formatada` | Data no formato BR | 12/06/2026 |
| `hora_venda` | Hora da venda | 14:30:15 |
| `dia_semana` | Dia da semana | Quarta-feira |
| `codigo_vendedor` | Código do vendedor | VEND123 |
| `nome_vendedor` | Nome completo | João Silva |
| `titulo_entrega` | Nome do produto/entrega | Cesta Básica Premium |
| `valor_venda` | Valor em R$ | 250.50 |
| `pontos_ganhos` | Pontos concedidos | 25 |
| `tinha_presenca` | Tinha presença no dia? | Sim / Não |

---

## 💡 Exemplos Práticos

### Exemplo 1: Relatório Mensal para o Chefe
```sql
-- Use a Query 2 (Resumo por Data) do EXPORT_DAILY_SALES.sql
-- Mostra totais por dia do mês
```

### Exemplo 2: Comissão de Vendedor
```sql
-- Use a Query 4 com o código do vendedor:
SELECT * FROM export_sales('2026-06-01'::DATE, '2026-06-30'::DATE, 'CODIGO_DO_VENDEDOR');
```

### Exemplo 3: Análise de Desempenho
```sql
-- Use a Query 3 (Ranking de Vendedores)
-- Veja quem vendeu mais no período
```

### Exemplo 4: Conferência Diária
```sql
-- Use a Query 6 (Vendas de Hoje)
-- Para conferir no final do dia
```

---

## 🎯 Dicas

### Para Excel:
- Exporte como **CSV**
- O Excel abre automaticamente
- Todas as datas ficam formatadas em PT-BR

### Para Análises:
- Use a **Query 2** (Resumo Diário) para ver tendências
- Use a **Query 7** (Por Dia da Semana) para padrões
- Use a **Query 8** (Top Produtos) para estoque

### Para Comissões:
- Use a **Query 3** (Ranking) para ver totais por vendedor
- Filtre por período usando a **Query 4**

### Automação:
- Se quiser automatizar, use as **Funções SQL** (Opção 2)
- Podem ser chamadas por código ou APIs

---

## ❓ Perguntas Frequentes

**P: Como exporto vendas de maio 2026?**
```sql
-- Edite a Query 4 e mude as datas para:
'2026-05-01'  -- data inicial
'2026-05-31'  -- data final
```

**P: Como vejo só vendas com presença?**
```sql
-- Adicione ao final da Query 1:
WHERE (a.attributes->>'has_presence')::BOOLEAN = true
```

**P: Como exporto em JSON para meu sistema?**
1. Execute a query no Supabase Studio
2. Clique em "Export" → "JSON"
3. Salve o arquivo .json

**P: Posso agendar exportação automática?**
Sim! Depois de instalar as funções (Opção 2), você pode:
- Criar uma API endpoint no Vercel
- Usar Supabase Edge Functions
- Agendar com cron jobs

---

## 📝 Resumo Rápido

**Jeito Mais Fácil:**
1. Abra `EXPORT_DAILY_SALES.sql`
2. Copie a **Query 5** (Mês Atual)
3. Cole no Supabase Studio
4. Execute
5. Clique "Export" → "CSV"
6. Pronto! ✅

**Jeito Profissional:**
1. Instale as funções com `CREATE_SALES_EXPORT_FUNCTION.sql`
2. Use: `SELECT * FROM export_sales();`
3. Exporte como preferir

---

## 🔗 Arquivos

- `EXPORT_DAILY_SALES.sql` → 8 queries prontas para copiar/colar
- `CREATE_SALES_EXPORT_FUNCTION.sql` → Funções SQL reutilizáveis
- `GUIA_EXPORTACAO_VENDAS.md` → Este guia

---

**Precisa de ajuda?** Todos os arquivos têm exemplos comentados! 🚀
