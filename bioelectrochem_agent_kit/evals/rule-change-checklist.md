# Rule Change Checklist

Use this checklist whenever compatibility rules, scoring logic, or range logic changes.

## Before merge
- [ ] the rule objective is documented
- [ ] required inputs are explicit
- [ ] output implications are explicit
- [ ] confidence behavior is explicit
- [ ] missing-data behavior is explicit
- [ ] at least one valid-path test is defined
- [ ] at least one edge-case test is defined
- [ ] a golden-case impact review was considered

## After review
- [ ] report templates still align with the new logic
- [ ] ontology terms used by the rule still exist and are canonical
- [ ] downstream prompt files do not conflict with the new rule language
