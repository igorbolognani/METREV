# Quickstart Validation — Bioelectrochemical Domain Foundation

## Setup
1. Add the files from this kit to the repository.
2. Ensure VS Code customizations are enabled in the workspace.
3. Open the repository root so parent customization discovery works as intended.
4. Start with a golden case or a small real case.

## Happy path
1. Normalize `domain/cases/golden/case-001-high-strength-industrial-wastewater.yml`
2. Ask the system to map stack blocks and data gaps
3. Ask the system to compare improvement paths
4. Generate a consulting-style report
5. Validate the report with the domain checklist

## Failure path
1. Remove multiple critical fields from the case
2. Run evaluation again
3. Expected behavior:
   - confidence decreases
   - defaults and missing-data exposure increase
   - narrow recommendations are avoided
   - next measurements are recommended

## Edge case
1. Use the recovery-oriented golden case
2. Compare two cathode or separator pathways
3. Expected behavior:
   - cathode and separator dimensions become highly visible
   - dependence on gas-handling and purity logic is made explicit
