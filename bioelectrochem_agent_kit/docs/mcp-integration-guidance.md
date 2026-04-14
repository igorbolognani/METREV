# MCP Integration Guidance for the Bioelectrochemical Decision Platform

## Purpose

This document defines how MCP should be introduced into the project without letting external tools destabilize the ontology, rules, or evidence quality.

The short version is:

- use MCP to reduce research and retrieval friction
- do not use MCP as a substitute for domain contracts
- keep early MCP use read-only
- only connect sources that map cleanly into the internal schemas

---

## Why MCP belongs here

The project will eventually benefit from structured access to:
- issue and implementation workflow context
- internal benchmark stores
- supplier catalogs
- document repositories
- pilot logs or historical datasets

However, these gains only matter after the system can:
- normalize case input
- type evidence correctly
- score alternatives deterministically
- expose uncertainty and gaps

If those foundations are not in place, MCP just increases the volume of unstructured input.

---

## Adoption phases

### Phase 0 — GitHub workflow support
Keep MCP focused on repository workflow:
- issues
- pull requests
- ADR/spec navigation
- implementation traceability

This phase is low risk and complements your existing AI-assisted development workflow.

### Phase 1 — Read-only evidence enrichment
Add read-only MCP services for:
- internal literature index
- benchmark lookup
- supplier record lookup

In this phase, MCP helps retrieve candidate evidence but does not decide.

### Phase 2 — Structured internal services
Add project-owned MCP servers that expose:
- normalized evidence records
- benchmark datasets
- supplier metadata
- case comparison resources

This phase is where MCP becomes strategically valuable because the system is consuming project-owned structures, not random external text.

### Phase 3 — Operational integration
Only after the platform matures should you consider:
- historian or pilot-log access
- LIMS-style measurements
- live monitoring metadata
- decision-support dashboards exposed through MCP resources or apps

---

## Early design rules

1. Prefer read-only MCP tools first.
2. Never bypass ontology validation.
3. Never bypass evidence typing.
4. Never let live retrieval directly set scores.
5. Treat MCP responses as candidate inputs to be normalized.
6. Keep a human-readable provenance trail.

---

## Recommended MCP categories

| MCP category | Use early? | Purpose |
|---|---|---|
| GitHub workflow | Yes | specs, ADRs, issues, PR context |
| Internal evidence index | Yes, when available | retrieve candidate evidence objects |
| Supplier registry | Yes, when available | shortlist and metadata lookup |
| Case benchmark service | Later | compare cases against structured benchmarks |
| Live plant data / historian | Much later | operational integration, not foundation work |
| Arbitrary live-web search via MCP | No | too noisy for early rule-driven decisions |

---

## Recommended `mcp.json` strategy

Your existing `.vscode/mcp.json` can stay minimal at first.
When you are ready, expand it in small steps.

Use:
- user inputs for secrets
- workspace variables where appropriate
- sandboxed stdio servers on Linux/macOS when local execution is needed
- separate internal services by role

Below is a **template example**, not a claim that these servers already exist.

```json
{
  "servers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp"
    },
    "evidence-index": {
      "type": "stdio",
      "command": "python",
      "args": [
        "${workspaceFolder}/tools/mcp/evidence_index_server.py"
      ],
      "sandboxEnabled": true,
      "env": {
        "EVIDENCE_DB_PATH": "${workspaceFolder}/data/evidence.db"
      }
    },
    "supplier-registry": {
      "type": "stdio",
      "command": "python",
      "args": [
        "${workspaceFolder}/tools/mcp/supplier_registry_server.py"
      ],
      "sandboxEnabled": true,
      "env": {
        "SUPPLIER_DB_PATH": "${workspaceFolder}/data/suppliers.db"
      }
    }
  },
  "inputs": [
    {
      "id": "internal-api-token",
      "type": "promptString",
      "description": "Token for internal services when remote MCP endpoints are added",
      "password": true
    }
  ]
}
```

---

## Decision boundary

Introduce new MCP servers only when all three statements are true:

- the server maps to a stable internal use case
- the returned content can be normalized into current schemas
- the server reduces manual work without bypassing review and validation

If one of those is false, do not add the server yet.

---

## Recommended next implementation step

Keep only GitHub MCP active now.
Design the internal evidence and supplier schemas first.
When those schemas stabilize, build project-owned read-only MCP services around them.
