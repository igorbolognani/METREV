# Quickstart - Research Intelligence Review Table Engine

> 020 validation note: the research tables are an internal scientific tool. The implementation is useful for review packs and extraction follow-up, but full 019 closure still requires recording the complete validation matrix before claiming production-like readiness.

1. Start the local stack with `pnpm run local:view:up`.
2. Sign in at `http://localhost:3012/login` as `analyst@metrev.local`.
3. Open `/research/reviews`.
4. Create a review with a query such as `microbial fuel cell wastewater carbon felt`.
5. Open the review detail page.
6. Run queued extraction.
7. Add a structured custom column if needed.
8. Build an evidence pack and inspect the decision-input preview.

The MVP searches the existing METREV evidence warehouse. It does not call external search APIs from the UI.
