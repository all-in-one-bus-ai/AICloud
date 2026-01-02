#!/usr/bin/env python3
"""
Supabase Migration Runner - Using Supabase Management API
"""

import httpx
import time
from pathlib import Path
import json

# Supabase configuration
SUPABASE_URL = "https://ouipofstsbqoujfowwdg.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91aXBvZnN0c2Jxb3VqZm93d2RnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzMwODQxMSwiZXhwIjoyMDgyODg0NDExfQ.Ze6LBrF8s6pCMhlc6VP6DCQgX6oWUpijRVa6RAUoO4w"
DB_PASSWORD = "-mXm7Q%vMknM/!+"

def execute_sql(sql: str) -> dict:
    """Execute SQL using Supabase's pg-meta endpoint"""
    # The pg-meta service provides SQL execution
    url = f"{SUPABASE_URL}/pg/query"
    
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    
    with httpx.Client(timeout=120.0) as client:
        response = client.post(url, headers=headers, json={"query": sql})
        return {
            "status": response.status_code,
            "body": response.text[:1000] if response.text else ""
        }

def test_connection():
    """Test if we can connect to Supabase"""
    # Try to query a simple table
    url = f"{SUPABASE_URL}/rest/v1/"
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    }
    
    with httpx.Client() as client:
        response = client.get(url, headers=headers)
        print(f"API Test: {response.status_code}")
        return response.status_code == 200

def main():
    print("Testing Supabase connection...")
    
    # Test basic API access
    result = execute_sql("SELECT 1 as test;")
    print(f"SQL Execution test: {result}")
    
    if result["status"] != 200:
        print("Note: Direct SQL execution not available via REST API")
        print("Creating combined migration file for manual execution...")
        
        # Create combined SQL file
        migrations_dir = Path("/app/supabase/migrations")
        migration_files = sorted(migrations_dir.glob("*.sql"))
        
        combined = []
        for filepath in migration_files:
            sql = filepath.read_text()
            if sql.strip():
                combined.append(f"-- Migration: {filepath.name}")
                combined.append(sql)
                combined.append("")
        
        output = Path("/app/FULL_MIGRATION.sql")
        output.write_text('\n'.join(combined))
        print(f"\nCombined migration saved to: {output}")
        print(f"Size: {output.stat().st_size / 1024:.1f} KB")

if __name__ == "__main__":
    main()
