'use client';

import * as React from 'react';
import { useState } from 'react';
import type { KeyboardEvent } from 'react';

import type {
  PublicArticleDiagramNode,
  PublicArticleSection,
} from '@/components/public-topic-articles';

void React;

function activateOnKeyboard(
  event: KeyboardEvent<SVGGElement>,
  activate: () => void,
) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    activate();
  }
}

export function PublicArticleDiagram({
  section,
  topicSlug,
}: {
  section: PublicArticleSection;
  topicSlug: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const nodeWidth = 158;
  const nodeHeight = 112;
  const positions = [10, 180, 350, 520];
  const activeNode = section.diagramNodes[
    activeIndex
  ] as PublicArticleDiagramNode;
  const titleId = `${topicSlug}-${section.id}-diagram-title`;
  const descriptionId = `${topicSlug}-${section.id}-diagram-description`;

  return (
    <figure
      className="public-article-figure"
      data-testid={`public-article-diagram-${section.id}`}
    >
      <div className="public-article-figure__header">
        <span>Interactive diagram</span>
        <h3>{section.diagramTitle}</h3>
      </div>
      <svg
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className="public-article-diagram"
        role="group"
        viewBox="0 0 688 190"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title id={titleId}>{section.diagramTitle}</title>
        <desc id={descriptionId}>{section.diagramCaption}</desc>
        <defs>
          <marker
            id={`${topicSlug}-${section.id}-arrow`}
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="6"
            refY="4"
          >
            <path d="M0 0L8 4L0 8z" fill="currentColor" />
          </marker>
        </defs>
        {positions.slice(0, -1).map((x, index) => (
          <path
            className="public-article-diagram__connector"
            d={`M${x + nodeWidth + 4} 74H${positions[index + 1] - 7}`}
            key={`connector-${index}`}
            markerEnd={`url(#${topicSlug}-${section.id}-arrow)`}
          />
        ))}
        {section.diagramNodes.map((node, index) => {
          const x = positions[index];
          const isActive = index === activeIndex;
          const activate = () => setActiveIndex(index);

          return (
            <g
              aria-label={`${node.label}. ${node.explanation}`}
              aria-pressed={isActive}
              className={`public-article-diagram__node${isActive ? ' is-active' : ''}`}
              data-testid={`public-article-diagram-node-${index + 1}`}
              key={node.label}
              onClick={activate}
              onKeyDown={(event) => activateOnKeyboard(event, activate)}
              role="button"
              tabIndex={0}
            >
              <rect
                height={nodeHeight}
                rx="18"
                width={nodeWidth}
                x={x}
                y="18"
              />
              <circle cx={x + 25} cy="45" r="13" />
              <text
                className="public-article-diagram__number"
                textAnchor="middle"
                x={x + 25}
                y="49"
              >
                {String(index + 1).padStart(2, '0')}
              </text>
              <text
                className="public-article-diagram__label"
                textAnchor="middle"
                x={x + nodeWidth / 2}
                y="89"
              >
                {node.label}
              </text>
              <text
                className="public-article-diagram__action"
                textAnchor="middle"
                x={x + nodeWidth / 2}
                y="110"
              >
                {isActive ? 'Selected' : 'Select to inspect'}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="public-article-figure__caption">
        {section.diagramCaption}
      </figcaption>
      <p
        aria-live="polite"
        className="public-article-figure__explanation"
        data-testid={`public-article-diagram-explanation-${section.id}`}
        role="status"
      >
        <strong>{activeNode.label}.</strong> {activeNode.explanation}
      </p>
    </figure>
  );
}
