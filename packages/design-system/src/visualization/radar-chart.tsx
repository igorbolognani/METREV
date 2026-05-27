export interface RadarMetric {
  key: string;
  label: string;
  value: number;
}

export function RadarChart({
  metrics,
  label,
}: {
  metrics: RadarMetric[];
  label: string;
}) {
  const size = 120;
  const center = size / 2;
  const radius = 48;
  const points = metrics
    .map((metric, index) => {
      const angle =
        (Math.PI * 2 * index) / Math.max(metrics.length, 1) - Math.PI / 2;
      const valueRadius = Math.max(0, Math.min(1, metric.value)) * radius;
      return `${center + Math.cos(angle) * valueRadius},${center + Math.sin(angle) * valueRadius}`;
    })
    .join(' ');

  return (
    <svg
      className="metrev-radar"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="currentColor"
        opacity="0.18"
      />
      <circle
        cx={center}
        cy={center}
        r={radius / 2}
        fill="none"
        stroke="currentColor"
        opacity="0.12"
      />
      <polygon
        points={points}
        fill="currentColor"
        opacity="0.22"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
