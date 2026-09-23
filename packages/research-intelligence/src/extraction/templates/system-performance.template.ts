export const SYSTEM_PERFORMANCE_EXTRACTION_TEMPLATE = `
Extract structured system performance and design parameters from the paper.

Focus only on microbial fuel cells (MFC), microbial electrolysis cells (MEC),
electrochemical biosensors, and their wastewater treatment/management context.
Hydrogen is a secondary MEC output. Do not classify unrelated system families
or applications as active METREV scope.

Extract only information explicitly stated in the source. Do not infer
numerical values. If data is absent, return null and add the field path to
missing_fields.

Return technology class, reactor architecture, anode, cathode,
membrane/separator, substrate/feedstock, operating conditions, electrochemical
metrics, treatment metrics, product outputs, scale, implementation limitations,
missing important fields, evidence trace, and confidence.
`;
