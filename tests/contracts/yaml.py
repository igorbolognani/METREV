from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
NODE_WORKDIR = REPO_ROOT / "packages" / "domain-contracts"

NODE_YAML_SCRIPT = """
const fs = require('node:fs');
const yaml = require('js-yaml');

const input = fs.readFileSync(0, 'utf8');
const value = yaml.load(input);
process.stdout.write(JSON.stringify(value));
""".strip()


def safe_load(stream: Any):
    if hasattr(stream, "read"):
        content = stream.read()
    else:
        content = str(stream)

    completed = subprocess.run(
        ["node", "-e", NODE_YAML_SCRIPT],
        capture_output=True,
        cwd=NODE_WORKDIR,
        input=content,
        text=True,
    )

    if completed.returncode != 0:
        stderr = completed.stderr.strip() or "unknown node yaml error"
        raise RuntimeError(f"Node YAML parsing failed: {stderr}")

    output = completed.stdout.strip()
    return json.loads(output) if output else None
