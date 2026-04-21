# 016 Metrev UI Refactor Research

## Radix Without Tailwind

- Radix primitives are unstyled and accessible, which fits the repository decision to keep CSS ownership in `apps/web-ui/src/app/globals.css`.
- The implementation path here is manual wrapper adoption, not `shadcn` scaffold generation.
- Local wrappers provide stable APIs while letting the METREV runtime keep its existing IBM Plex typography, warm surfaces, and token naming.

## nuqs Tradeoffs

- `nuqs` requires the App Router adapter, so the runtime provider layer must include `NuqsAdapter` before any query-state hooks are used.
- Query-backed UI state should stay limited to tabs, filters, sort order, and wizard steps. Domain data and mutations still belong to the existing route and query layers.
- The repository should not mix `nuqs` query-state hooks with ad hoc `useSearchParams` for the same state surface.

## Client-side Sort And Filter

- The current evidence review and evaluations list endpoints already return complete local-first datasets suitable for client-side filtering and ordering.
- Client-side sort and filter avoids adding server contract changes during the UI refactor.
- The tradeoff is predictable only while list sizes stay moderate. If those lists grow materially, server-side sort and filter should become a follow-up backlog item.

## Bulk Fan-out Strategy

- The current backend exposes single-item review mutation paths, not a bulk endpoint.
- Bulk actions should therefore use `Promise.allSettled` fan-out over the existing mutation helper.
- Partial failure must not be hidden. The UI should surface a summary dialog with explicit succeeded and failed IDs after the run completes.
- No optimistic rollback is required for the first cut. Invalidate and refetch the queue after completion so the runtime view reflects the authoritative backend state.
