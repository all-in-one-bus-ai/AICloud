#!/usr/bin/env python3
"""
Supabase Migration Runner using direct PostgreSQL connection
"""

import psycopg2
import os
import time
from pathlib import Path

# Supabase PostgreSQL connection details
# Format: postgresql://postgres.[project-ref]:[password]@[region].pooler.supabase.com:6543/postgres
# The service role key JWT contains the project ref: ouipofstsbqoujfowwdg

PROJECT_REF = "ouipofstsbqoujfowwdg"

# Supabase uses a specific connection string format
# We need the database password from the Supabase dashboard
# For now, let's try using the pooler connection

def get_connection_string():
    """Build PostgreSQL connection string for Supabase"""
    # Direct connection (requires database password)
    # The connection details are typically:
    # Host: db.[project-ref].supabase.co
    # Port: 5432
    # Database: postgres
    # User: postgres
    # Password: [database password from Supabase dashboard]
    
    # Alternative: Use the SQL API through the dashboard
    return None

def split_sql_statements(sql_content: str) -> list:
    """Split SQL content into individual statements"""
    # Simple split by semicolon, but handle special cases
    statements = []
    current = []
    in_dollar_quote = False
    in_function = False
    
    lines = sql_content.split('\n')
    
    for line in lines:
        stripped = line.strip()
        
        # Skip comments
        if stripped.startswith('--'):
            current.append(line)
            continue
            
        # Track dollar-quoted strings (used in functions)
        if '$$' in line:
            in_dollar_quote = not in_dollar_quote
        
        # Track CREATE FUNCTION blocks
        if 'CREATE FUNCTION' in line.upper() or 'CREATE OR REPLACE FUNCTION' in line.upper():
            in_function = True
        
        current.append(line)
        
        # Check for statement end
        if stripped.endswith(';') and not in_dollar_quote:
            if in_function and ('LANGUAGE' in stripped.upper() or 'language' in stripped):
                in_function = False
            if not in_function:
                statement = '\n'.join(current).strip()
                if statement and not statement.startswith('--'):
                    statements.append(statement)
                current = []
    
    # Add any remaining content
    if current:
        statement = '\n'.join(current).strip()
        if statement and not statement.startswith('--'):
            statements.append(statement)
    
    return statements

def run_migrations_via_supabase_api():
    """
    Since direct database connection requires the database password,
    we'll create a comprehensive SQL file that can be run via the Supabase Dashboard
    """
    migrations_dir = Path("/app/supabase/migrations")
    migration_files = sorted(migrations_dir.glob("*.sql"))
    
    print(f"Found {len(migration_files)} migration files")
    print("=" * 60)
    
    # Combine all migrations
    combined_sql = []
    combined_sql.append("-- CloudPOS Database Migration")
    combined_sql.append("-- Generated automatically")
    combined_sql.append("-- Run this in Supabase SQL Editor")
    combined_sql.append("")
    
    for filepath in migration_files:
        sql = filepath.read_text()
        if sql.strip():
            combined_sql.append(f"\n-- ========================================")
            combined_sql.append(f"-- Migration: {filepath.name}")
            combined_sql.append(f"-- ========================================\n")
            combined_sql.append(sql)
    
    # Write combined file
    output_path = Path("/app/complete_migration.sql")
    output_path.write_text('\n'.join(combined_sql))
    
    print(f"Combined migration written to: {output_path}")
    print(f"Total size: {output_path.stat().st_size / 1024:.1f} KB")
    
    return str(output_path)

if __name__ == "__main__":
    run_migrations_via_supabase_api()
