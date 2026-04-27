import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
    PUBLIC_TOPIC_SLUGS,
    getPublicTopicConfig,
} from '@/components/public-topic-content';
import { PublicTopicPage } from '@/components/public-topic-page';

export async function generateStaticParams() {
  return PUBLIC_TOPIC_SLUGS.map((topic) => ({ topic }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic } = await params;
  const topicConfig = getPublicTopicConfig(topic);

  if (!topicConfig) {
    return {
      title: 'METREV',
    };
  }

  return {
    title: `${topicConfig.navLabel} | METREV`,
    description: topicConfig.cardSummary,
  };
}

export default async function PublicTopicRoute({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const topicConfig = getPublicTopicConfig(topic);

  if (!topicConfig) {
    notFound();
  }

  return (
    <main className="landing-main">
      <PublicTopicPage topic={topicConfig} />
    </main>
  );
}
