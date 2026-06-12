# 🎯 Exportação de Vendas GCOM - Sistema Completo

## ✅ O Que Foi Criado

### 1. **Script Principal** (`export_gcom_sales.py`)
Exportador completo de vendas GCOM direto do MySQL para CSV/JSON.

### 2. **Script de Teste** (`test_gcom_connection.py`)
Valida conexão MySQL antes de exportar.

### 3. **Arquivos de Configuração**
- `gcom_config.json` - Suas credenciais MySQL (você precisa preencher)
- `gcom_config.example.json` - Exemplo de configuração
- `requirements.txt` - Dependências Python

### 4. **Documentação**
- `README_EXPORTADOR_GCOM.md` - Manual completo de uso
- `GCOM_MYSQL_INFO.md` - Informações sobre credenciais N8N
- `EXPORTACAO_GCOM_PRONTO.md` - Este arquivo

---

## 🚀 Como Usar (Passo a Passo)

### Passo 1: Instalar Python e Dependências

```bash
# Verificar se Python está instalado
python --version

# Instalar dependência MySQL
pip install mysql-connector-python
```

**Ou use o requirements.txt:**
```bash
pip install -r requirements.txt
```

### Passo 2: Configurar Credenciais MySQL

Você precisa das credenciais do MySQL do GCOM que estão configuradas no N8N.

**Onde encontrar no N8N:**
1. Abra N8N
2. Vá em **Settings** → **Credentials**
3. Procure **"MySQL account"** (ID: `eLovY2x6l0lcVsKF`)
4. Copie: Host, Port, Database, User, Password

**Edite o arquivo `gcom_config.json`:**
```json
{
  "host": "IP_OU_HOSTNAME_DO_SERVIDOR_GCOM",
  "port": 3306,
  "user": "usuario_mysql",
  "password": "senha_mysql",
  "database": "nome_do_database"
}
```

### Passo 3: Testar Conexão

Antes de exportar, teste se a conexão funciona:

```bash
python test_gcom_connection.py
```

**Resultado esperado:**
```
🔍 Testando conexão MySQL GCOM...

   Host: seu_host
   Port: 3306
   Database: seu_database
   User: seu_usuario

✅ Conexão estabelecida com sucesso!
✅ Tabela 'g4u_actions_v' encontrada!
✅ Total de vendas finalizadas: 12,345
✅ Última venda registrada: 2026-06-12 15:30:00

✅ Teste concluído com sucesso!
   Você pode rodar: python export_gcom_sales.py
```

### Passo 4: Exportar Vendas

```bash
# Exportar mês atual (mais simples)
python export_gcom_sales.py

# Ver apenas resumo (sem exportar)
python export_gcom_sales.py --summary-only

# Exportar junho 2026
python export_gcom_sales.py --start 2026-06-01 --end 2026-06-30

# Exportar em JSON
python export_gcom_sales.py --format json
```

---

## 📊 Exemplos de Uso Real

### Exemplo 1: Relatório Mensal Completo
```bash
python export_gcom_sales.py --start 2026-06-01 --end 2026-06-30 --output relatorio_junho_2026.csv
```
**Resultado:** Arquivo CSV com todas as vendas de junho pronto para Excel.

### Exemplo 2: Conferência Diária
```bash
# Ver resumo de hoje
python export_gcom_sales.py --start 2026-06-12 --end 2026-06-12 --summary-only
```
**Mostra:**
```
📊 RESUMO DAS VENDAS
============================================================
Total de Vendas: 87
Valor Total: R$ 8,945.50
Ticket Médio: R$ 102.82
Total de Vendedores: 12
============================================================
```

### Exemplo 3: Comissão de Vendedor
```bash
python export_gcom_sales.py --employee joao@empresa.com --start 2026-06-01 --end 2026-06-30
```
**Resultado:** CSV apenas com vendas do João.

### Exemplo 4: Exportar Última Hora (Simular N8N)
```bash
# Crie um script batch/shell
python export_gcom_sales.py --start "$(date -d '1 hour ago' '+%Y-%m-%d %H:00:00')" --end "$(date '+%Y-%m-%d %H:59:59')"
```

---

## 📋 Colunas Exportadas

O CSV/JSON contém exatamente o que o N8N consulta:

| Coluna | Exemplo | Descrição |
|--------|---------|-----------|
| `ID_ETB_GCOM` | 1 | ID do estabelecimento |
| `ID_EMP_GCOM` | joao@empresa.com | Email do vendedor |
| `status` | completed | Status da venda |
| `delivery_id` | 12345 | ID da entrega |
| `delivery_title` | Cesta Básica Premium | Nome do produto |
| `created_at` | 2026-06-12 14:30:00 | Data/hora criação |
| `finished_at` | 2026-06-12 14:35:00 | Data/hora finalização |
| `integration_id` | INT-789 | ID integração |
| `price` | 250.50 | Valor R$ |
| `comments` | Entrega agendada | Comentários |
| `action_id` | ACT-456 | ID da ação |

---

## 🔧 Troubleshooting

### Problema: "Module not found: mysql.connector"
**Solução:**
```bash
pip install mysql-connector-python
```

### Problema: "Access denied for user"
**Possíveis causas:**
1. Senha incorreta no `gcom_config.json`
2. Usuário não tem permissão na tabela `g4u_actions_v`

**Verificar permissões:**
```sql
SHOW GRANTS FOR 'seu_usuario'@'seu_host';
```

### Problema: "Can't connect to MySQL server"
**Possíveis causas:**
1. Host/IP incorreto
2. Porta 3306 bloqueada por firewall
3. MySQL não está rodando

**Testar conexão:**
```bash
# Windows
telnet SEU_HOST 3306

# Linux/Mac
nc -zv SEU_HOST 3306
```

### Problema: "Table 'g4u_actions_v' doesn't exist"
**Verificar nome da tabela:**
```sql
SHOW TABLES LIKE '%actions%';
```

Se a tabela tiver outro nome, edite o script `export_gcom_sales.py` na linha da query (linha ~69).

---

## 🎯 Comparação: N8N vs Script Python

| Aspecto | N8N Workflow | Script Python |
|---------|--------------|---------------|
| **Período** | Última hora (fixo) | Qualquer período |
| **Formato** | Webhook → Supabase | CSV/JSON direto |
| **Velocidade** | ~2-5 min/hora | <1 segundo |
| **Dependências** | N8N rodando | Python + 1 lib |
| **Histórico** | Não exporta passado | Exporta qualquer data |
| **Excel** | Via Supabase | Direto (CSV) |

---

## 📦 Arquivos Criados

```
📁 FNP-Ranking/
├── 📄 export_gcom_sales.py              ← Script principal
├── 📄 test_gcom_connection.py           ← Teste de conexão
├── 📄 gcom_config.json                  ← Suas credenciais (preencher!)
├── 📄 gcom_config.example.json          ← Exemplo
├── 📄 requirements.txt                  ← Dependências
├── 📄 README_EXPORTADOR_GCOM.md         ← Manual completo
├── 📄 GCOM_MYSQL_INFO.md                ← Info sobre credenciais N8N
└── 📄 EXPORTACAO_GCOM_PRONTO.md         ← Este arquivo
```

---

## ✅ Checklist Rápido

- [ ] Python instalado (`python --version`)
- [ ] Dependência instalada (`pip install mysql-connector-python`)
- [ ] Credenciais obtidas do N8N
- [ ] Arquivo `gcom_config.json` preenchido
- [ ] Teste de conexão OK (`python test_gcom_connection.py`)
- [ ] Primeira exportação (`python export_gcom_sales.py --summary-only`)
- [ ] Exportação completa (`python export_gcom_sales.py`)

---

## 🚀 Status: PRONTO PARA USAR!

Tudo está configurado. Você só precisa:

1. **Preencher credenciais** em `gcom_config.json`
2. **Testar conexão** com `python test_gcom_connection.py`
3. **Exportar vendas** com `python export_gcom_sales.py`

**Tempo estimado:** 5 minutos para configurar + segundos para exportar

---

## 📞 Próximos Passos

Após configurar e testar:

1. ✅ Exporte o mês atual para validar dados
2. ✅ Compare com dados do Supabase (se necessário)
3. ✅ Configure exportação automática (cron/Task Scheduler)
4. ✅ Integre com seu sistema de análise

---

**Precisa de ajuda?**
- Leia `README_EXPORTADOR_GCOM.md` para exemplos detalhados
- Leia `GCOM_MYSQL_INFO.md` para info sobre credenciais
- Execute `python export_gcom_sales.py --help` para ver todas as opções

**Sistema criado e pronto! 🎉**
