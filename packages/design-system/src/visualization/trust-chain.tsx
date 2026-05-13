import { cx } from '../utils';

const stages = [
  'ingested',
  'accepted',
  'canonicalized',
  'decision_ready',
  'benchmark',
] as const;

export type TrustChainStage = (typeof stages)[number];

export function TrustChainIndicator({
  stage,
  className,
}: {
  stage: TrustChainStage;
  className?: string;
}) {
  const activeIndex = stages.indexOf(stage);
  return (
    <ol
      className={cx('metrev-trust-chain', className)}
      aria-label={`Evidence trust chain stage ${stage}`}
    >
      {stages.map((item, index) => (
        <li
          key={item}
          className={cx(
            'metrev-trust-chain-step',
            index <= activeIndex && 'is-complete',
          )}
          title={item.replaceAll('_', ' ')}
        >
          <span className="metrev-trust-chain-dot" />
        </li>
      ))}
    </ol>
  );
}
