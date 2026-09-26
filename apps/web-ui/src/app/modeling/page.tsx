import type { Metadata } from 'next';

import { ModelingWorkbench } from '@/components/modeling/modeling-workbench';

export const metadata: Metadata = {
  title: 'Modeling workbench | METREV',
  description:
    'Inspect configurable MFC and MEC stack assemblies, model fidelity boundaries, and source-backed component parameters.',
};

export default function ModelingPage() {
  return <ModelingWorkbench />;
}
