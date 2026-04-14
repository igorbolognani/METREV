---
name: map-stack-and-data-gaps
description: Map a case across the stack blocks and expose the most decision-relevant data gaps.
argument-hint: Provide a normalized case object or stack summary.
agent: agent
---

Map the following case across the defined stack blocks and identify the highest-impact data gaps:

${input}

Requirements:
- organize findings by stack block
- include architecture, anode, cathode, membrane/separator, electrical interconnect/sealing, BOP, sensing/analytics, biology, and technoeconomics
- distinguish between absent data and low-confidence data
- explain which missing fields are merely useful and which are decision-critical

Return:
1. stack map by block
2. known data by block
3. unknown or ambiguous data by block
4. decision-critical gaps
5. recommended next measurements
