# Research Table Trace Contract Note

## Purpose

Define the persistence and contract direction required before METREV claims table, line, column, or cell-aware research extraction at scale.

## Canonical owner files

- `packages/domain-contracts/src/research-schemas.ts`
- `packages/database/prisma/schema.prisma`
- `packages/research-intelligence/src/extraction/`
- `bioelectrochem_agent_kit/domain/ontology/research-taxonomy.yml`

## Proposed trace requirements

- table identity, caption, page number, and source locator
- row and column indexes with optional header/value cell typing
- cell text or normalized value trace when available
- original unit, normalized unit, and normalization rule id for numeric observations
- extraction method, confidence/veracity, and review status
- ability to reference a text span or a table cell from downstream evidence packs and concept records

## Notes

- current text-chunk traces are insufficient for honest table-aware claims
- metadata growth and accepted structured evidence must remain separate counts
- concept promotion should remain review-aware before it influences stack comparison or presets
