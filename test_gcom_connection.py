#!/usr/bin/env python3
"""
Teste rápido de conexão MySQL GCOM
Valida credenciais antes de rodar o exportador completo
"""

import mysql.connector
import json
import sys

def load_config():
    """Carrega configuração do arquivo JSON"""
    try:
        with open('gcom_config.json', 'r') as f:
            config = json.load(f)
        return config
    except FileNotFoundError:
        print("❌ Arquivo gcom_config.json não encontrado!")
        print("   Crie o arquivo com as credenciais MySQL")
        sys.exit(1)
    except json.JSONDecodeError:
        print("❌ Erro ao ler gcom_config.json - JSON inválido")
        sys.exit(1)

def test_connection(config):
    """Testa conexão MySQL"""
    print("🔍 Testando conexão MySQL GCOM...\n")
    print(f"   Host: {config.get('host')}")
    print(f"   Port: {config.get('port')}")
    print(f"   Database: {config.get('database')}")
    print(f"   User: {config.get('user')}")
    print()
    
    try:
        # Tentar conectar
        conn = mysql.connector.connect(**config)
        print("✅ Conexão estabelecida com sucesso!")
        
        # Testar se a tabela existe
        cursor = conn.cursor()
        cursor.execute("SHOW TABLES LIKE 'g4u_actions_v'")
        result = cursor.fetchone()
        
        if result:
            print("✅ Tabela 'g4u_actions_v' encontrada!")
            
            # Contar registros
            cursor.execute("SELECT COUNT(*) FROM g4u_actions_v WHERE finished_at IS NOT NULL")
            count = cursor.fetchone()[0]
            print(f"✅ Total de vendas finalizadas: {count:,}")
            
            # Pegar data mais recente
            cursor.execute("SELECT MAX(created_at) FROM g4u_actions_v")
            last_date = cursor.fetchone()[0]
            if last_date:
                print(f"✅ Última venda registrada: {last_date}")
            
        else:
            print("⚠️  Tabela 'g4u_actions_v' não encontrada!")
            print("   Verifique se o nome está correto ou se você tem permissão")
        
        cursor.close()
        conn.close()
        
        print("\n✅ Teste concluído com sucesso!")
        print("   Você pode rodar: python export_gcom_sales.py")
        return True
        
    except mysql.connector.Error as e:
        print(f"❌ Erro ao conectar no MySQL: {e}")
        print("\nPossíveis causas:")
        print("  • Host/IP incorreto")
        print("  • Porta bloqueada (padrão: 3306)")
        print("  • Usuário ou senha incorretos")
        print("  • Database não existe")
        print("  • Permissões insuficientes")
        return False

if __name__ == '__main__':
    config = load_config()
    success = test_connection(config)
    sys.exit(0 if success else 1)

