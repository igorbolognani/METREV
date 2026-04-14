---
name: write-consulting-report
description: Turn structured evaluation outputs into a consulting-style report with transparent uncertainty.
argument-hint: Provide structured case findings or a draft decision package.
agent: agent
---

Write a consulting-style technical report from the following structured findings:

${input}

Requirements:
- follow the repository report contract
- preserve explicit uncertainty
- keep facts, assumptions, and recommendations distinguishable
- avoid exaggerated certainty
- keep the tone technical, decision-oriented, and audit-friendly

Return the report with these sections:
1. executive framing
2. current stack diagnosis
3. prioritized improvement options
4. impact map
5. supplier/material/architecture shortlist
6. phased roadmap
7. confidence, gaps, and next tests
