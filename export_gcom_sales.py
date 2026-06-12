#!/usr/bin/env python3
"""
Exportador de Vendas GCOM
Conecta direto no MySQL do GCOM e exporta vendas para CSV/Excel
Leve, rápido, sem dependências pesadas
"""

import mysql.connector
import csv
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import argparse

# ============================================================================
# CONFIGURAÇÃO - EDITE AQUI
# ============================================================================

# Credenciais MySQL do GCOM (baseadas no N8N workflow)
# A credencial "MySQL account" (id: eLovY2x6l0lcVsKF) deve ser configurada
MYSQL_CONFIG = {
    'host': 'localhost',  # Ajuste conforme necessário
    'port': 3306,
    'user': 'seu_usuario',  # Preencha com credenciais do N8N
    'password': 'sua_senha',  # Preencha com credenciais do N8N
    'database': 'gcom'  # Nome do database do GCOM
}

# ============================================================================
# FUNÇÕES PRINCIPAIS
# ============================================================================

def connect_mysql():
    """Conecta no MySQL do GCOM"""
    try:
        conn = mysql.connector.connect(**MYSQL_CONFIG)
        print("✅ Conectado ao MySQL do GCOM")
        return conn
    except mysql.connector.Error as e:
        print(f"❌ Erro ao conectar no MySQL: {e}")
        return None


def fetch_sales(
    conn,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    employee_id: Optional[str] = None
) -> List[Dict]:
    """
    Busca vendas do GCOM
    
    Args:
        conn: Conexão MySQL
        start_date: Data inicial (YYYY-MM-DD) ou None para mês atual
        end_date: Data final (YYYY-MM-DD) ou None para hoje
        employee_id: ID do empregado ou None para todos
    
    Returns:
        Lista de vendas
    """
    # Se não fornecer datas, usa o mês atual
    if not start_date:
        start_date = datetime.now().replace(day=1).strftime('%Y-%m-%d')
    if not end_date:
        end_date = datetime.now().strftime('%Y-%m-%d')
    
    # Query base
    query = """
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
            created_at >= %s
            AND created_at <= %s
            AND finished_at IS NOT NULL
    """
    
    params = [start_date + ' 00:00:00', end_date + ' 23:59:59']
    
    # Filtrar por empregado se fornecido
    if employee_id:
        query += " AND ID_EMP_GCOM = %s"
        params.append(employee_id)
    
    query += " ORDER BY created_at DESC"
    
    cursor = conn.cursor(dictionary=True)
    cursor.execute(query, params)
    results = cursor.fetchall()
    cursor.close()
    
    print(f"✅ Encontradas {len(results)} vendas")
    return results


def export_to_csv(sales: List[Dict], filename: str):
    """Exporta vendas para CSV"""
    if not sales:
        print("⚠️  Nenhuma venda para exportar")
        return
    
    # Colunas para o CSV
    fieldnames = [
        'ID_ETB_GCOM',
        'ID_EMP_GCOM',
        'status',
        'delivery_id',
        'delivery_title',
        'created_at',
        'finished_at',
        'integration_id',
        'price',
        'comments',
        'action_id'
    ]
    
    with open(filename, 'w', newline='', encoding='utf-8-sig') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for sale in sales:
            # Converter datetime para string
            row = {}
            for key, value in sale.items():
                if isinstance(value, datetime):
                    row[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                else:
                    row[key] = value
            writer.writerow(row)
    
    print(f"✅ Exportado para: {filename}")


def export_to_json(sales: List[Dict], filename: str):
    """Exporta vendas para JSON"""
    if not sales:
        print("⚠️  Nenhuma venda para exportar")
        return
    
    # Converter datetime para string
    sales_json = []
    for sale in sales:
        row = {}
        for key, value in sale.items():
            if isinstance(value, datetime):
                row[key] = value.strftime('%Y-%m-%d %H:%M:%S')
            else:
                row[key] = value
        sales_json.append(row)
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(sales_json, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Exportado para: {filename}")


def print_summary(sales: List[Dict]):
    """Imprime resumo das vendas"""
    if not sales:
        return
    
    total_vendas = len(sales)
    total_valor = sum(float(s.get('price', 0) or 0) for s in sales)
    vendedores = set(s['ID_EMP_GCOM'] for s in sales if s.get('ID_EMP_GCOM'))
    
    print("\n" + "="*60)
    print("📊 RESUMO DAS VENDAS")
    print("="*60)
    print(f"Total de Vendas: {total_vendas}")
    print(f"Valor Total: R$ {total_valor:,.2f}")
    print(f"Ticket Médio: R$ {total_valor/total_vendas:,.2f}" if total_vendas > 0 else "Ticket Médio: R$ 0,00")
    print(f"Total de Vendedores: {len(vendedores)}")
    print("="*60 + "\n")


# ============================================================================
# INTERFACE DE LINHA DE COMANDO
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='Exporta vendas do GCOM MySQL para CSV ou JSON',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos de uso:

  # Exportar vendas do mês atual para CSV
  python export_gcom_sales.py

  # Exportar vendas de junho 2026
  python export_gcom_sales.py --start 2026-06-01 --end 2026-06-30

  # Exportar para JSON
  python export_gcom_sales.py --format json

  # Exportar vendas de um vendedor específico
  python export_gcom_sales.py --employee vendedor@email.com

  # Exportar com nome de arquivo customizado
  python export_gcom_sales.py --output minhas_vendas.csv

  # Apenas mostrar resumo (sem exportar)
  python export_gcom_sales.py --summary-only
        """
    )
    
    parser.add_argument(
        '--start',
        help='Data inicial (YYYY-MM-DD). Padrão: primeiro dia do mês atual',
        default=None
    )
    
    parser.add_argument(
        '--end',
        help='Data final (YYYY-MM-DD). Padrão: hoje',
        default=None
    )
    
    parser.add_argument(
        '--employee',
        help='ID do empregado (email). Padrão: todos',
        default=None
    )
    
    parser.add_argument(
        '--format',
        choices=['csv', 'json'],
        default='csv',
        help='Formato de saída (csv ou json). Padrão: csv'
    )
    
    parser.add_argument(
        '--output',
        help='Nome do arquivo de saída. Padrão: vendas_YYYYMMDD.csv',
        default=None
    )
    
    parser.add_argument(
        '--summary-only',
        action='store_true',
        help='Apenas mostra resumo, sem exportar arquivo'
    )
    
    parser.add_argument(
        '--config',
        help='Arquivo JSON com configurações MySQL (sobrescreve valores padrão)',
        default=None
    )
    
    args = parser.parse_args()
    
    # Carregar config de arquivo se fornecido
    if args.config:
        try:
            with open(args.config, 'r') as f:
                config = json.load(f)
                MYSQL_CONFIG.update(config)
            print(f"✅ Configuração carregada de: {args.config}")
        except Exception as e:
            print(f"⚠️  Erro ao carregar config: {e}")
    
    # Conectar no MySQL
    conn = connect_mysql()
    if not conn:
        return
    
    try:
        # Buscar vendas
        print(f"\n🔍 Buscando vendas...")
        if args.start:
            print(f"   Data inicial: {args.start}")
        if args.end:
            print(f"   Data final: {args.end}")
        if args.employee:
            print(f"   Vendedor: {args.employee}")
        print()
        
        sales = fetch_sales(
            conn,
            start_date=args.start,
            end_date=args.end,
            employee_id=args.employee
        )
        
        # Mostrar resumo
        print_summary(sales)
        
        # Exportar se não for summary-only
        if not args.summary_only and sales:
            # Determinar nome do arquivo
            if args.output:
                filename = args.output
            else:
                timestamp = datetime.now().strftime('%Y%m%d')
                extension = args.format
                filename = f"vendas_{timestamp}.{extension}"
            
            # Exportar no formato escolhido
            if args.format == 'csv':
                export_to_csv(sales, filename)
            else:
                export_to_json(sales, filename)
        
    finally:
        conn.close()
        print("✅ Conexão fechada")


# ============================================================================
# PONTO DE ENTRADA
# ============================================================================

if __name__ == '__main__':
    main()

