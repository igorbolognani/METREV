# Source Artifact Boundary

Local source artifacts are persistence-backed source material linked to canonical `ExternalSourceRecord` rows. They do not replace the source-document warehouse.

## Rules

- `ExternalSourceRecord` remains the source-document identity and dedupe boundary.
- Source artifacts store local file metadata, extraction method, file hash, and import status.
- Source text chunks store extracted text locally with page/chunk locators for review and extraction.
- Repository seed files may include metadata and short claim snippets only; raw PDFs and full extracted text stay local.
- Analyst review is still required before imported evidence is used downstream.
