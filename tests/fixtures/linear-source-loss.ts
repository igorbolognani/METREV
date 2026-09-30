export function linearSourceLoss(production: number, loss: number) {
  const source = {
    source_kind: 'test_fixture' as const,
    source_ref: 'test-fixture://linear-source-loss',
    source_locator: 'synthetic coefficients; no empirical calibration',
  };
  return {
    law: 'constant_source_first_order_loss' as const,
    source_rate_mol_m3_s: { ...source, value: production, unit: 'mol/(m3*s)' },
    loss_rate_per_s: { ...source, value: loss, unit: '1/s' },
  };
}
