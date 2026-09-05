#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

EXCLUDED_DIRS = {
    ".git",
    ".vercel",
    "node_modules",
    ".next",
    "dist",
    "build",
    "coverage",
    "__pycache__",
}

SENSITIVE_BASENAMES = {
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
    ".env.preview",
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def iter_files(root: Path):
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        if any(part in EXCLUDED_DIRS for part in path.parts):
            continue
        yield path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate a deterministic SHA-256 manifest for a recovered MAKSR production source tree."
    )
    parser.add_argument("root", help="Recovered source directory")
    parser.add_argument(
        "--output",
        default="recovered-source-sha256.json",
        help="Output manifest path",
    )
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not root.exists() or not root.is_dir():
        raise SystemExit(f"Source directory not found: {root}")

    violations: list[str] = []
    entries: list[dict[str, object]] = []

    for path in iter_files(root):
        relative = path.relative_to(root).as_posix()
        if path.name in SENSITIVE_BASENAMES or path.name.startswith(".env."):
            violations.append(relative)
            continue
        entries.append(
            {
                "path": relative,
                "size": path.stat().st_size,
                "sha256": sha256_file(path),
            }
        )

    payload = {
        "algorithm": "SHA-256",
        "root": root.name,
        "file_count": len(entries),
        "files": entries,
        "sensitive_files_detected": violations,
        "eligible_for_cutover": len(violations) == 0 and len(entries) > 0,
    }

    output = Path(args.output)
    output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Wrote {len(entries)} file hashes to {output}")
    if violations:
        print("Sensitive files detected; cutover must remain blocked:")
        for item in violations:
            print(f"  - {item}")
        return 2
    if not entries:
        print("No source files found; cutover must remain blocked.")
        return 3

    print("Source tree passed the local integrity-manifest gate.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
