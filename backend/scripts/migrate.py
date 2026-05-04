import psycopg2
import os
import sys

# URL từ file .env
DATABASE_URL = "postgresql://neondb_owner:npg_hT4PreflZx7v@ep-mute-haze-aot6awnb.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
MIGRATION_FILE = "migrations/0007_inventory_service.sql"

def run_migration():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        
        print(f"Reading migration file: {MIGRATION_FILE}")
        with open(MIGRATION_FILE, 'r') as f:
            sql = f.read()
        
        print("Executing migration...")
        cursor.execute(sql)
        print("Migration successful!")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
