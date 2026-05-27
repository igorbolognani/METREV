const blocks = [
  'reactor architecture',
  'anode biofilm support',
  'cathode catalyst support',
  'membrane or separator',
  'electrical interconnect',
  'balance of plant',
  'sensors and analytics',
  'operational biology',
] as const;

export function StackDiagram({
  onSelect,
}: {
  onSelect?: (block: string) => void;
}) {
  return (
    <div
      className="metrev-stack-diagram"
      aria-label="Bioelectrochemical stack blocks"
    >
      {blocks.map((block, index) => (
        <button
          key={block}
          type="button"
          className="metrev-stack-block"
          style={{ gridArea: `b${index + 1}` }}
          onClick={() => onSelect?.(block)}
        >
          <span>{block}</span>
        </button>
      ))}
    </div>
  );
}
