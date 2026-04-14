---
name: use-context7
description: 'Use this skill when implementation depends on external library or framework documentation, setup, configuration, or version-specific APIs.'
---

# Use Context7

Use this skill when the task depends on:
- framework setup
- version-specific API behavior
- library configuration
- SDK usage
- code generation or scaffolding that depends on current docs

## Required behavior
1. identify the library or framework that needs verification
2. prefer current docs over model memory
3. state any unresolved ambiguity explicitly
4. fold the verified behavior into the implementation or plan

## Success criteria
- generated code matches current docs
- setup steps are version-aware
- undocumented or invented APIs are avoided
