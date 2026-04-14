---
name: intake-client-stack
description: Normalize a raw client stack description into a structured case object.
argument-hint: Paste the raw client case, meeting notes, or stack description.
agent: agent
---

Normalize the following raw client stack input into the project case schema:

${input}

Requirements:
- preserve the original meaning
- use canonical domain names where possible
- identify defaults used
- identify missing or ambiguous fields
- state how missing information affects downstream inference
- recommend the smallest set of next measurements or questions that would most reduce uncertainty

Return:
1. raw input summary
2. normalized case
3. defaults used
4. missing data
5. assumptions
6. confidence notes
7. recommended next measurements
