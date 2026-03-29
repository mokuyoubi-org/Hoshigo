import sys
import re

src, dst = sys.argv[1], sys.argv[2]

with open(src, "r", encoding="utf-8") as f:
    content = f.read()


# ── 行単位の変換 ────────────────────────────────────────────────────────────
output = []
for line in content.splitlines(keepends=True):
    line = re.sub(r'\bCREATE TABLE\b(?!\s+IF\s+NOT\s+EXISTS)',
                  'CREATE TABLE IF NOT EXISTS', line, flags=re.IGNORECASE)
    line = re.sub(r'\bCREATE SEQUENCE\b(?!\s+IF\s+NOT\s+EXISTS)',
                  'CREATE SEQUENCE IF NOT EXISTS', line, flags=re.IGNORECASE)
    line = re.sub(r'\bCREATE SCHEMA\b(?!\s+IF\s+NOT\s+EXISTS)',
                  'CREATE SCHEMA IF NOT EXISTS', line, flags=re.IGNORECASE)
    line = re.sub(r'\bCREATE INDEX\b(?!\s+IF\s+NOT\s+EXISTS)(?!\s+CONCURRENTLY)',
                  'CREATE INDEX IF NOT EXISTS', line, flags=re.IGNORECASE)
    line = re.sub(r'\bCREATE UNIQUE INDEX\b(?!\s+IF\s+NOT\s+EXISTS)',
                  'CREATE UNIQUE INDEX IF NOT EXISTS', line, flags=re.IGNORECASE)
    line = re.sub(r'\bCREATE TYPE\b(?!\s+IF\s+NOT\s+EXISTS)',
                  'CREATE TYPE IF NOT EXISTS', line, flags=re.IGNORECASE)
    line = re.sub(r'\bCREATE TRIGGER\b(?!\s+OR\s+REPLACE)',
                  'CREATE OR REPLACE TRIGGER', line, flags=re.IGNORECASE)
    output.append(line)

result = "".join(output)


# ── ADD COLUMN → IF NOT EXISTS ──────────────────────────────────────────────
result = re.sub(
    r'(ALTER TABLE[^;]+ADD COLUMN)\s+(?!IF\s+NOT\s+EXISTS)',
    r'\1 IF NOT EXISTS ', result, flags=re.IGNORECASE
)


# ── 文単位のラップ処理 ──────────────────────────────────────────────────────
def wrap_blocks(text, wrap_fn):
    """文単位でテキストを走査し、wrap_fnがNone以外を返した文を変換する"""
    result = []
    i = 0
    while i < len(text):
        stmt_start = i
        depth, in_str, stmt_end = 0, False, -1
        while i < len(text):
            ch = text[i]
            if ch == "'" and not in_str:    in_str = True
            elif ch == "'" and in_str:      in_str = False
            elif ch == '(' and not in_str:  depth += 1
            elif ch == ')' and not in_str:  depth -= 1
            elif ch == ';' and not in_str and depth == 0:
                stmt_end = i
                i += 1
                break
            i += 1
        if stmt_end == -1:
            result.append(text[stmt_start:])
            break
        stmt = text[stmt_start:stmt_end + 1]
        wrapped = wrap_fn(stmt)
        result.append(wrapped if wrapped is not None else stmt)
    return "".join(result)


def wrap_identity(stmt):
    """ADD GENERATED AS IDENTITY: シーケンス重複を回避"""
    if not (re.search(r'ADD GENERATED\b', stmt, re.IGNORECASE) and
            re.search(r'SEQUENCE NAME', stmt, re.IGNORECASE)):
        return None
    m = re.search(r'SEQUENCE NAME\s+"?([^"\s.]+)"?\.?"?([^"\s;)]+)"?', stmt, re.IGNORECASE)
    if not m:
        return None
    return (
        f"DO $identity_guard$\nBEGIN\n"
        f"  IF NOT EXISTS (\n    SELECT 1 FROM pg_sequences\n"
        f"    WHERE schemaname = '{m.group(1)}' AND sequencename = '{m.group(2)}'\n"
        f"  ) THEN\n    {stmt.strip()}\n  END IF;\n"
        f"END $identity_guard$;\n"
    )


def wrap_constraint(stmt):
    """ADD CONSTRAINT: 制約重複を回避"""
    m = re.search(
        r'ADD CONSTRAINT\s+"?([^"\s]+)"?\s+(PRIMARY KEY|UNIQUE|FOREIGN KEY|CHECK)\b',
        stmt, re.IGNORECASE
    )
    if not m:
        return None
    tm = re.search(
        r'ALTER TABLE\s+(?:ONLY\s+)?"?([^"\s]+)"?\."?([^"\s]+)"?',
        stmt, re.IGNORECASE
    )
    if not tm:
        return None
    return (
        f"DO $constraint_guard$\nBEGIN\n"
        f"  IF NOT EXISTS (\n    SELECT 1 FROM pg_constraint c\n"
        f"    JOIN pg_namespace n ON n.oid = c.connamespace\n"
        f"    WHERE n.nspname = '{tm.group(1)}' AND c.conname = '{m.group(1)}'\n"
        f"  ) THEN\n    {stmt.strip()}\n  END IF;\n"
        f"END $constraint_guard$;\n"
    )


def wrap_policy(stmt):
    """CREATE POLICY: DROP IF EXISTS してから再作成"""
    m = re.match(
        r'\s*CREATE POLICY\s+"?([^"\s]+)"?\s+ON\s+"?([^"\s.]+)"?\."?([^"\s]+)"?',
        stmt, re.IGNORECASE
    )
    if not m:
        return None
    drop = f'DROP POLICY IF EXISTS "{m.group(1)}" ON "{m.group(2)}"."{m.group(3)}";'
    return f"{drop}\n{stmt.strip()}\n"


result = wrap_blocks(result, wrap_identity)
result = wrap_blocks(result, wrap_constraint)
result = wrap_blocks(result, wrap_policy)

with open(dst, "w", encoding="utf-8") as f:
    f.write(result)

print(f"Safe DDL written to {dst}")