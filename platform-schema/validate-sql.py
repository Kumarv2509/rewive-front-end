#!/usr/bin/env python3
"""Validate a DDL file against the real PostgreSQL grammar, before it is ever applied.

Production Postgres is VNet-only with public access disabled, so DDL bound for
`rewive-infra` cannot be smoke-tested from a laptop. This is the next best
thing: libpg_query is the actual PostgreSQL parser, so a clean run here rules
out every syntax error and, more usefully, the two mistakes that only surface
at apply time.

Checks:
  1. Every statement parses (libpg_query, via pglast).
  2. Every PL/pgSQL function body parses — the outer CREATE FUNCTION is just a
     string literal to the SQL parser, so a broken body parses clean without
     this.

     Note on how check 2 reads its result. pglast 8.4's `parse_plpgsql` cannot
     deserialize its own successful output: every body, down to a trivial
     `BEGIN RETURN NEW; END`, raises JSONDecodeError at the same offset. The
     underlying parser is fine — a body with a real syntax error still raises
     ParseError. So ParseError is treated as a failure and JSONDecodeError as
     a pass. If a future pglast fixes the deserializer, this still works: the
     success path simply stops raising.
  3. No forward foreign keys — a REFERENCES to a table created later in the
     file fails at apply, not at review. This one has bitten before.

A clean run is NOT a clean apply: it says nothing about whether roles exist,
whether extensions are available, or whether the objects already exist.

Usage:  ./pgvenv/bin/python validate-sql.py shared-dimensions.sql
Needs:  pglast (Homebrew arm64 python — the macOS system python 3.9 is x86_64
        and the wheel will not load).
"""

import json
import sys
from pglast import parse_sql, parse_plpgsql
from pglast import ast
from pglast.parser import ParseError


def qualified(rangevar) -> str:
    schema = rangevar.schemaname or "public"
    return f"{schema}.{rangevar.relname}"


def main(path: str) -> int:
    sql = open(path).read()

    try:
        statements = parse_sql(sql)
    except Exception as exc:
        print(f"PARSE FAILED: {exc}")
        return 1

    created: set[str] = set()
    forward_refs: list[str] = []
    counts: dict[str, int] = {}
    plpgsql_checked = 0

    for raw in statements:
        node = raw.stmt
        kind = type(node).__name__
        counts[kind] = counts.get(kind, 0) + 1

        if isinstance(node, ast.CreateStmt):
            table = qualified(node.relation)
            # Collect this table's outbound references BEFORE marking it
            # created, so a self-FK is not mistaken for a forward reference.
            refs: list[str] = []
            for elt in node.tableElts or ():
                constraints = ()
                if isinstance(elt, ast.ColumnDef):
                    constraints = elt.constraints or ()
                elif isinstance(elt, ast.Constraint):
                    constraints = (elt,)
                for con in constraints:
                    if isinstance(con, ast.Constraint) and con.pktable is not None:
                        refs.append(qualified(con.pktable))
            created.add(table)
            for target in refs:
                if target not in created:
                    forward_refs.append(f"{table} -> {target}")

        elif isinstance(node, ast.CreateFunctionStmt):
            body = sql[raw.stmt_location : raw.stmt_location + raw.stmt_len]
            try:
                parse_plpgsql(body)
                plpgsql_checked += 1
            except ParseError as exc:
                print(f"PL/pgSQL BODY FAILED TO PARSE: {exc}")
                return 1
            except json.JSONDecodeError:
                # Known pglast 8.4 deserializer bug — see the note in __doc__.
                # The body parsed; only the result could not be rebuilt.
                plpgsql_checked += 1

    print(f"{path}")
    print(f"  statements parsed ....... {len(statements)}")
    print(f"  tables created .......... {len(created)}")
    print(f"  plpgsql bodies parsed ... {plpgsql_checked}")
    print("  statement mix:")
    for kind, n in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"      {n:>3}  {kind}")

    if forward_refs:
        print("\n  FORWARD FOREIGN KEYS (these fail at apply):")
        for ref in forward_refs:
            print(f"      {ref}")
        return 1

    print("\n  no forward foreign keys")
    print("  OK — parses clean. Not applied, and not a substitute for an apply.")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
