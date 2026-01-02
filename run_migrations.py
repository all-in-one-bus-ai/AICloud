#!/usr/bin/env python3
"""
Supabase Migration Runner - Direct PostgreSQL Connection
"""

import psycopg2
import time
from pathlib import Path
import re

# Supabase PostgreSQL connection details
# Using the pooler connection (transaction mode)
DB_CONFIG = {
    "host": "aws-0-us-east-1.pooler.supabase.com",
    "port": 6543,
    "database": "postgres",
    "user": "postgres.ouipofstsbqoujfowwdg",
    "password": "-mXm7Q%vMknM/!+",
    "sslmode": "require"
}

def get_connection():
    """Create database connection"""
    return psycopg2.connect(**DB_CONFIG)

def run_migration_file(filepath: Path, cursor) -> tuple:
    """Run a single migration file"""
    try:
        sql = filepath.read_text()
        
        # Skip empty files
        if not sql.strip():
            return True, "Empty file, skipped"
        
        # Execute the entire file as one transaction
        cursor.execute(sql)
        return True, "Success"
        
    except psycopg2.Error as e:
        error_msg = str(e).split('\n')[0]  # Get first line of error
        return False, error_msg
    except Exception as e:
        return False, str(e)

def main():
    migrations_dir = Path("/app/supabase/migrations")
    migration_files = sorted(migrations_dir.glob("*.sql"))
    
    print(f"Found {len(migration_files)} migration files")
    print("=" * 60)
    print("Connecting to Supabase PostgreSQL...")
    
    try:
        conn = get_connection()
        conn.autocommit = True  # Each migration runs independently
        cursor = conn.cursor()
        print("✓ Connected successfully!")
        print("=" * 60)
        
        success_count = 0
        error_count = 0
        
        for i, filepath in enumerate(migration_files, 1):
            print(f"\n[{i}/{len(migration_files)}] {filepath.name}")
            
            success, message = run_migration_file(filepath, cursor)
            
            if success:
                print(f"  ✓ {message}")
                success_count += 1
            else:
                print(f"  ✗ {message}")
                error_count += 1
            
            time.sleep(0.2)  # Small delay between migrations
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 60)
        print(f"Migration completed!")
        print(f"  Successful: {success_count}")
        print(f"  Errors: {error_count}")
        print("=" * 60)
        
        return error_count == 0
        
    except psycopg2.Error as e:
        print(f"✗ Database connection failed: {e}")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
