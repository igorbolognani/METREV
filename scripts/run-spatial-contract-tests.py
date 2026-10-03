#!/usr/bin/env python3
"""Preserve all native contract tests; defer one expensive mesh series in fast CI."""
import argparse
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
EXPENSIVE = {'test_three_meshes_nonuniform_fields_and_conservative_observables'}


def selected(suite, fast):
    for case in suite:
        if isinstance(case, unittest.TestSuite):
            yield from selected(case, fast)
        elif not fast or getattr(case, '_testMethodName', '') not in EXPENSIVE:
            yield case


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mode', choices=['fast', 'full'], default='full')
    options = parser.parse_args()
    discovered = unittest.defaultTestLoader.discover(str(ROOT / 'tests/contracts'), pattern='test_spatial_*.py')
    suite = unittest.TestSuite(selected(discovered, options.mode == 'fast'))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    raise SystemExit(0 if result.wasSuccessful() else 1)
