---
name: build-supplier-shortlist
description: Build a supplier/material shortlist from decision constraints and evidence categories.
argument-hint: Provide the case constraints, target block, and evaluation criteria.
agent: agent
---

Build a supplier/material shortlist for the following case:

${input}

Requirements:
- organize the shortlist by target stack block or procurement need
- distinguish known evidence from supplier claims
- include fit notes, integration notes, and open questions
- avoid presenting the shortlist as a final procurement decision
- surface missing technical or commercial data needed before commitment

Return:
1. shortlist objective
2. shortlist grouped by category
3. fit rationale for each shortlisted path
4. missing vendor or technical information
5. procurement cautions
6. next validation steps
