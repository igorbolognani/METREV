---
name: use-context7
description: Use this skill when implementation depends on external library or framework documentation, setup, configuration, or version-specific APIs.
---

# Use Context7 for external libraries and APIs

Use this skill when a task depends on:
- library documentation
- framework setup
- version-specific API behavior
- SDK usage
- configuration examples
- code generation that depends on external docs

## Required behavior
1. Resolve the correct library or framework.
2. Prefer version-specific docs when relevant.
3. Use Context7 before proposing code that depends on external APIs.
4. If docs are ambiguous, say so explicitly.
5. Do not rely only on model memory for library behavior.

## Success criteria
- generated code matches current docs
- setup/config instructions are version-aware
- hallucinated APIs are avoided
