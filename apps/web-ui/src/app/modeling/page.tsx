import type { Metadata } from 'next';
import Link from 'next/link';

import { ModelingWorkbench } from '@/components/modeling/modeling-workbench';

export const metadata: Metadata = {
  title: 'Modeling workbench | METREV',
  description:
    'Inspect configurable MFC and MEC stack assemblies, model fidelity boundaries, and source-backed component parameters.',
};

export default function ModelingPage() {
  return (
    <>
      <Link href="/modeling/spatial" className="block p-4">
        Spatial cell development · sourced 2D/3D inputs and numerical fields
      </Link>
      <ModelingWorkbench />
    </>
  );
}
