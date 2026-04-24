export const SYSTEM_PERFORMANCE_EXTRACTION_TEMPLATE = `
Extract structured system performance and design parameters from the paper.

Focus on microbial electrochemical systems, including MFC, MEC, MDC, BES,
bioelectrochemical sensors, and hybrid wastewater-energy systems.

Extract only information explicitly stated in the source. Do not infer
numerical values. If data is absent, return null and add the field path to
missing_fields.

Return technology class, reactor architecture, anode, cathode,
membrane/separator, substrate/feedstock, operating conditions, electrochemical
metrics, treatment metrics, product outputs, scale, implementation limitations,
missing important fields, evidence trace, and confidence.
`;
