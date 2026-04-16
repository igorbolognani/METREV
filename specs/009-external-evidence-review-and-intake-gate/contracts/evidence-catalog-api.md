# Planning Note — Evidence Catalog API

## Purpose

Describe the internal runtime API surface for browsing, reviewing, and selecting external-evidence catalog records before those shapes are implemented in the TypeScript runtime contract layer.

## Canonical owner files

- `packages/domain-contracts/src/schemas.ts`
- `packages/database/prisma/schema.prisma`

This note is planning-only. It must not become a second source of truth for the runtime contract.

## Disposition

No hardened YAML contract promotion is needed in this slice because the implemented surface remains an internal runtime API backed by TypeScript schemas in the canonical owner files above.

## Proposed routes

### `GET /api/external-evidence`

- role: `VIEWER`
- query params:
  - `status`: optional `pending | accepted | rejected`
  - `q`: optional free-text search against title, summary, DOI, or publisher
- response shape:
  - `items`: catalog item summaries with review status, source metadata, provenance note, and applicability scope
  - `summary`: total, pending, accepted, and rejected counts for the full queue

### `GET /api/external-evidence/:id`

- role: `VIEWER`
- response shape:
  - one catalog item detail record with source metadata, abstract text when available, and stored payload context

### `POST /api/external-evidence/:id/review`

- role: `ANALYST`
- request body:
  - `action`: `accept | reject`
  - `note`: optional short review note for audit payload only
- response shape:
  - updated catalog item detail record

## Gate behavior

- only catalog items with `accepted` review status are eligible for intake selection
- pending and rejected items remain visible in the review queue but must not be offered in the intake selector
- intake selection must map accepted catalog items into the existing `evidence_records` array rather than inventing a second evaluation payload field
