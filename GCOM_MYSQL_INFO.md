# Informações MySQL GCOM (Extraídas do N8N)

## Credenciais Necessárias

Baseado no workflow N8N, o script precisa das credenciais do MySQL configuradas no N8N com ID `eLovY2x6l0lcVsKF` (nome: "MySQL account").

### Como Obter as Credenciais

1. Abra o N8N
2. Vá em **Settings** → **Credentials**
3. Procure por **"MySQL account"** (ID: `eLovY2x6l0lcVsKF`)
4. Copie as informações:
   - Host
   - Port (padrão: 3306)
   - Database
   - User
   - Password

### Preencher no Script

Opção 1: Editar `gcom_config.json`:
```json
{
  "host": "SEU_HOST_AQUI",
  "port": 3306,
  "user": "SEU_USUARIO_AQUI",
  "password": "SUA_SENHA_AQUI",
  "database": "NOME_DATABASE_AQUI"
}
```

Opção 2: Editar diretamente no `export_gcom_sales.py` (linha 17-23).

## Tabela Usada

O script consulta a view/tabela: **`g4u_actions_v`**

### Colunas da Tabela

Baseado no workflow N8N, a tabela tem estas colunas:

```sql
SELECT 
  ID_ETB_GCOM,        -- ID do estabelecimento
  ID_EMP_GCOM,        -- Email do empregado/vendedor
  status,             -- Status da venda
  delivery_id,        -- ID da entrega
  delivery_title,     -- Nome do produto/entrega
  created_at,         -- Data/hora de criação
  finished_at,        -- Data/hora de finalização
  integration_id,     -- ID de integração
  price,              -- Valor da venda (R$)
  comments,           -- Comentários
  action_id           -- ID da ação
FROM
  g4u_actions_v
WHERE
  created_at > "DATA_HORA_INICIAL"
  AND finished_at IS NOT NULL
ORDER BY
  created_at DESC
```

## Query Original do N8N

```sql
SELECT 
  ID_ETB_GCOM,
  ID_EMP_GCOM,
  status,
  delivery_id,
  delivery_title,
  created_at,
  finished_at,
  integration_id,
  price,
  comments,
  action_id
FROM
  g4u_actions_v
WHERE
  created_at > "{{ $json.horaAnterior }}"
  AND finished_at IS NOT NULL
ORDER BY
  created_at DESC
```

**Observação:** O workflow N8N usa `horaAnterior` (última hora) para buscar vendas novas a cada hora.

## Fluxo Original (N8N → Funifier)

O workflow antigo fazia:

1. **Schedule Trigger** (a cada hora)
2. **Calculate Last Hour** (hora anterior)
3. **Fetch New Sales from GCOM** (query MySQL)
4. **Split Sales** (processa cada venda)
5. **Call Vercel Webhook** (envia para API)
6. **Check Success** (verifica resposta)
7. **Log Success/Error** (registra resultado)

## Novo Script Python

O script `export_gcom_sales.py` faz consulta **direta** no MySQL do GCOM, sem passar pelo N8N ou webhooks.

### Vantagens

✅ Mais rápido (sem intermediários)
✅ Exporta qualquer período (não só última hora)
✅ Formato CSV/JSON para análise
✅ Não depende de N8N rodando

### Como Testar Conexão

Antes de rodar o script, teste a conexão MySQL:

```bash
# Usando mysql client (se tiver instalado)
mysql -h SEU_HOST -u SEU_USUARIO -p -e "SELECT COUNT(*) FROM g4u_actions_v"

# Ou usando Python
python -c "import mysql.connector; conn = mysql.connector.connect(host='SEU_HOST', user='SEU_USUARIO', password='SUA_SENHA', database='SEU_DATABASE'); print('✅ Conectado!'); conn.close()"
```

## Próximos Passos

1. ✅ Obter credenciais MySQL do N8N
2. ✅ Preencher `gcom_config.json`
3. ✅ Instalar dependência: `pip install mysql-connector-python`
4. ✅ Testar: `python export_gcom_sales.py --summary-only`
5. ✅ Exportar: `python export_gcom_sales.py`

---

**Precisa das credenciais?** Acesse N8N → Settings → Credentials → "MySQL account"
