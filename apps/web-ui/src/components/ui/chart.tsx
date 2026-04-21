'use client';

import {
    CartesianGrid,
    Legend,
    Line,
    LineChart as RechartsLineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

export interface ChartLine {
  color?: string;
  dataKey: string;
  dot?: boolean;
  label?: string;
  strokeWidth?: number;
}

export interface LineChartPanelProps {
  className?: string;
  data: Array<Record<string, number | string | null>>;
  description?: string;
  height?: number;
  lines: ChartLine[];
  title: string;
  xKey: string;
}

const fallbackLineColors = [
  'var(--accent)',
  'var(--status-accent-text)',
  'var(--status-success-text)',
  'var(--status-warning-text)',
  'var(--status-critical-text)',
];

export function LineChartPanel({
  className,
  data,
  description,
  height = 280,
  lines,
  title,
  xKey,
}: LineChartPanelProps) {
  const hasData = data.length > 0 && lines.length > 0;

  return (
    <Card className={className} variant="muted">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="ui-chart" style={{ height }}>
            <ResponsiveContainer height="100%" width="100%">
              <RechartsLineChart
                accessibilityLayer
                data={data}
                margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
              >
                <CartesianGrid
                  stroke="var(--line-strong)"
                  strokeDasharray="3 3"
                />
                <XAxis axisLine={false} dataKey={xKey} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--panel-elevated)',
                    border: '1px solid var(--line-strong)',
                    borderRadius: '16px',
                    boxShadow: '0 18px 40px rgba(30, 29, 26, 0.1)',
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: 12 }} />
                {lines.map((line, index) => (
                  <Line
                    activeDot={{ r: 4 }}
                    dataKey={line.dataKey}
                    dot={line.dot ?? false}
                    key={line.dataKey}
                    name={line.label ?? line.dataKey}
                    stroke={
                      line.color ??
                      fallbackLineColors[index % fallbackLineColors.length]
                    }
                    strokeWidth={line.strokeWidth ?? 2}
                    type="monotone"
                  />
                ))}
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="ui-chart-empty">No chart data available.</div>
        )}
      </CardContent>
    </Card>
  );
}
