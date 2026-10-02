import { SpatialCellWorkbench } from '@/components/modeling/spatial-cell-workbench';
export default async function SpatialModelingPage({
  searchParams,
}: {
  searchParams: Promise<{ evaluation?: string }>;
}) {
  const query = await searchParams;
  return (
    <SpatialCellWorkbench
      initialEvaluationId={
        typeof query.evaluation === 'string' ? query.evaluation : ''
      }
    />
  );
}
