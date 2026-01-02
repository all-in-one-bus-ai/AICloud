#!/usr/bin/env python3
"""
Supabase Migration Runner
Runs SQL migrations against a Supabase database using the Management API
"""

import os
import httpx
import time
from pathlib import Path

# Supabase configuration
SUPABASE_URL = "https://ouipofstsbqoujfowwdg.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91aXBvZnN0c2Jxb3VqZm93d2RnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzMwODQxMSwiZXhwIjoyMDgyODg0NDExfQ.Ze6LBrF8s6pCMhlc6VP6DCQgX6oWUpijRVa6RAUoO4w"

# PostgreSQL connection via Supabase
# Using the SQL execution endpoint
SQL_ENDPOINT = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"

def execute_sql_via_rpc(sql: str, client: httpx.Client) -> dict:
    """Execute SQL via a custom RPC function (if available)"""
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    response = client.post(
        SQL_ENDPOINT,
        headers=headers,
        json={"query": sql},
        timeout=60.0
    )
    return response

def create_exec_sql_function(client: httpx.Client) -> bool:
    """Create a helper function to execute raw SQL"""
    # This won't work via REST API - we need direct database access
    return False

def run_migration_file(filepath: Path, client: httpx.Client) -> tuple[bool, str]:
    """Run a single migration file"""
    try:
        sql = filepath.read_text()
        
        # Skip empty files
        if not sql.strip():
            return True, "Empty file, skipped"
        
        response = execute_sql_via_rpc(sql, client)
        
        if response.status_code in [200, 201, 204]:
            return True, "Success"
        else:
            return False, f"HTTP {response.status_code}: {response.text[:500]}"
            
    except Exception as e:
        return False, str(e)

def main():
    migrations_dir = Path("/app/supabase/migrations")
    migration_files = sorted(migrations_dir.glob("*.sql"))
    
    print(f"Found {len(migration_files)} migration files")
    print("=" * 60)
    
    with httpx.Client() as client:
        for i, filepath in enumerate(migration_files, 1):
            print(f"\n[{i}/{len(migration_files)}] Running: {filepath.name}")
            success, message = run_migration_file(filepath, client)
            
            if success:
                print(f"  ✓ {message}")
            else:
                print(f"  ✗ {message}")
            
            time.sleep(0.5)  # Rate limiting
    
    print("\n" + "=" * 60)
    print("Migration process completed!")

if __name__ == "__main__":
    main()
