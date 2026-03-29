import subprocess
import os

DEV_URL  = os.environ["SUPABASE_DB_URL_DEV"]
PROD_URL = os.environ["SUPABASE_DB_URL_PROD"]
OUT      = "supabase/migrations/diff_deletions.sql"

SCHEMAS   = ("public", "system", "game", "users")
schema_in = "'" + "','".join(SCHEMAS) + "'"


def query(url, sql):
    r = subprocess.run(
        ["psql", url, "-At", "-c", sql],
        capture_output=True, text=True, check=True
    )
    return {row for row in r.stdout.strip().splitlines() if row}


lines = ["-- Auto-generated deletion DDL\n", "BEGIN;\n\n"]

# ── Functions / Procedures ─────────────────────────────────────────────────
sql_funcs = (
    f"SELECT n.nspname||'.'||p.proname"
    f"||'('||pg_get_function_identity_arguments(p.oid)||')' "
    f"FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace "
    f"WHERE n.nspname IN ({schema_in}) AND p.prokind IN ('f','p')"
)
for fn in sorted(query(PROD_URL, sql_funcs) - query(DEV_URL, sql_funcs)):
    lines.append(f"DROP FUNCTION IF EXISTS {fn} CASCADE;\n")

# ── Triggers ───────────────────────────────────────────────────────────────
sql_trg = (
    f"SELECT trigger_schema||'.'||trigger_name||'@'||event_object_table "
    f"FROM information_schema.triggers "
    f"WHERE trigger_schema IN ({schema_in})"
)
for t in sorted(query(PROD_URL, sql_trg) - query(DEV_URL, sql_trg)):
    schema_name, rest = t.split(".", 1)
    trg_name, tbl     = rest.split("@", 1)
    lines.append(f"DROP TRIGGER IF EXISTS {trg_name} ON {schema_name}.{tbl} CASCADE;\n")

# ── Views ──────────────────────────────────────────────────────────────────
sql_view = (
    f"SELECT table_schema||'.'||table_name FROM information_schema.views "
    f"WHERE table_schema IN ({schema_in})"
)
for v in sorted(query(PROD_URL, sql_view) - query(DEV_URL, sql_view)):
    lines.append(f"DROP VIEW IF EXISTS {v} CASCADE;\n")

# ── Policies ───────────────────────────────────────────────────────────────
sql_pol = (
    f"SELECT n.nspname||'.'||p.polname||'@'||c.relname "
    f"FROM pg_policy p "
    f"JOIN pg_class c ON c.oid = p.polrelid "
    f"JOIN pg_namespace n ON n.oid = c.relnamespace "
    f"WHERE n.nspname IN ({schema_in})"
)
for p in sorted(query(PROD_URL, sql_pol) - query(DEV_URL, sql_pol)):
    schema_name, rest = p.split(".", 1)
    pol_name, tbl     = rest.split("@", 1)
    lines.append(f'DROP POLICY IF EXISTS "{pol_name}" ON "{schema_name}"."{tbl}";\n')

# ── Columns ────────────────────────────────────────────────────────────────
sql_col = (
    f"SELECT table_schema||'.'||table_name||'.'||column_name "
    f"FROM information_schema.columns "
    f"WHERE table_schema IN ({schema_in})"
)
for c in sorted(query(PROD_URL, sql_col) - query(DEV_URL, sql_col)):
    tbl, col = c.rsplit(".", 1)
    lines.append(f"ALTER TABLE IF EXISTS {tbl} DROP COLUMN IF EXISTS {col};\n")

# ── Tables ─────────────────────────────────────────────────────────────────
sql_tbl = (
    f"SELECT table_schema||'.'||table_name FROM information_schema.tables "
    f"WHERE table_schema IN ({schema_in}) AND table_type='BASE TABLE'"
)
for t in sorted(query(PROD_URL, sql_tbl) - query(DEV_URL, sql_tbl)):
    lines.append(f"DROP TABLE IF EXISTS {t} CASCADE;\n")

lines.append("\nCOMMIT;\n")

with open(OUT, "w") as f:
    f.writelines(lines)

print(f"Deletion DDL written to {OUT}")