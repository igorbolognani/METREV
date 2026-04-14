from __future__ import annotations

import importlib.util
import traceback
from pathlib import Path


def _load_module(module_path: Path):
    spec = importlib.util.spec_from_file_location("contract_checks", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load test module from {module_path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> int:
    test_module_path = Path(__file__).with_name("test_canonical_vocabulary.py")
    module = _load_module(test_module_path)

    failures: list[tuple[str, str]] = []
    executed = 0

    for name in sorted(dir(module)):
        if not name.startswith("test_"):
            continue

        candidate = getattr(module, name)
        if not callable(candidate):
            continue

        executed += 1
        try:
            candidate()
        except Exception:
            failures.append((name, traceback.format_exc()))

    if failures:
        print(f"{len(failures)} contract check(s) failed:")
        for name, details in failures:
            print(f"\n[name] {name}\n{details}")
        return 1

    print(f"{executed} contract check(s) passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
