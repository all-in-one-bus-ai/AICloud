from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, HTMLResponse
import os

app = FastAPI(title="CloudPOS Backend API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "CloudPOS Backend"}

@app.get("/api")
async def root():
    return {"message": "CloudPOS Backend API", "version": "1.0.0"}

@app.get("/api/migrations", response_class=HTMLResponse)
async def migrations_page():
    """Page with links to download migration SQL files"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>CloudPOS Database Migrations</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            h1 { color: #2563eb; }
            .part { background: #f1f5f9; padding: 15px; margin: 10px 0; border-radius: 8px; }
            a { color: #2563eb; text-decoration: none; font-weight: bold; }
            a:hover { text-decoration: underline; }
            .instructions { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; }
            code { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; }
        </style>
    </head>
    <body>
        <h1>CloudPOS Database Migrations</h1>
        
        <div class="instructions">
            <h3>Instructions:</h3>
            <ol>
                <li>Download each SQL file below (right-click → Save as)</li>
                <li>Go to Supabase Dashboard → SQL Editor</li>
                <li>Run each part <strong>IN ORDER</strong> (Part 1 first, then 2, etc.)</li>
                <li>Wait for each part to complete before running the next</li>
            </ol>
        </div>
        
        <div class="part">
            <h3>Part 1: Core Schema (69KB) - Run First</h3>
            <p>Creates core tables: tenants, branches, users, products, sales, etc.</p>
            <a href="/api/migrations/part1">📥 Download Part 1 SQL</a>
        </div>
        
        <div class="part">
            <h3>Part 2: Indexes & Optimization (17KB)</h3>
            <p>Adds indexes and RLS optimizations</p>
            <a href="/api/migrations/part2">📥 Download Part 2 SQL</a>
        </div>
        
        <div class="part">
            <h3>Part 3: Additional Modules (80KB)</h3>
            <p>Gift cards, invoices, restaurant, warehouse modules</p>
            <a href="/api/migrations/part3">📥 Download Part 3 SQL</a>
        </div>
        
        <div class="part">
            <h3>Part 4: Advanced Features (24KB)</h3>
            <p>AI forecasting, device settings, more features</p>
            <a href="/api/migrations/part4">📥 Download Part 4 SQL</a>
        </div>
        
        <div class="part">
            <h3>Part 5: Final Fixes (37KB) - Run Last</h3>
            <p>RLS policies, signup functions, security</p>
            <a href="/api/migrations/part5">📥 Download Part 5 SQL</a>
        </div>
        
        <hr style="margin: 30px 0;">
        
        <div class="part">
            <h3>Complete Migration (All-in-One) - 225KB</h3>
            <p>All migrations combined. Use this if you prefer a single file.</p>
            <a href="/api/migrations/complete">📥 Download Complete Migration SQL</a>
        </div>
    </body>
    </html>
    """
    return html

@app.get("/api/migrations/part1", response_class=PlainTextResponse)
async def get_migration_part1():
    with open("/app/migration_part_1__core_schema.sql", "r") as f:
        return f.read()

@app.get("/api/migrations/part2", response_class=PlainTextResponse)
async def get_migration_part2():
    with open("/app/migration_part_2__indexes_&_optimization.sql", "r") as f:
        return f.read()

@app.get("/api/migrations/part3", response_class=PlainTextResponse)
async def get_migration_part3():
    with open("/app/migration_part_3__additional_modules.sql", "r") as f:
        return f.read()

@app.get("/api/migrations/part4", response_class=PlainTextResponse)
async def get_migration_part4():
    with open("/app/migration_part_4__advanced_features.sql", "r") as f:
        return f.read()

@app.get("/api/migrations/part5", response_class=PlainTextResponse)
async def get_migration_part5():
    with open("/app/migration_part_5__final_fixes.sql", "r") as f:
        return f.read()

@app.get("/api/migrations/complete", response_class=PlainTextResponse)
async def get_migration_complete():
    with open("/app/COMPLETE_MIGRATION.sql", "r") as f:
        return f.read()
