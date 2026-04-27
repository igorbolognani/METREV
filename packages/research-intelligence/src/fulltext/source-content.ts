import { Buffer } from 'node:buffer';
import { inflateSync } from 'node:zlib';

import type {
    ResearchEvidenceTrace,
    ResearchPaperMetadata,
} from '@metrev/domain-contracts';

export interface HydratedResearchPaperText {
  contentType: string | null;
  fetchedFrom: string;
  source: 'xml' | 'html' | 'pdf';
  text: string;
  trace: ResearchEvidenceTrace[];
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripMarkup(value: string): string {
  return normalizeWhitespace(
    decodeHtmlEntities(
      value
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' '),
    ),
  );
}

function truncate(value: string, maxLength: number): string {
  const normalized = normalizeWhitespace(value);
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function decodePdfLiteralString(value: string): string {
  return value
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{3})/g, (_, octal: string) =>
      String.fromCharCode(Number.parseInt(octal, 8)),
    );
}

function extractTextOperators(content: string): string[] {
  const items: string[] = [];

  const textRegex = /\((?:\\.|[^\\)])*\)\s*Tj/g;
  for (const match of content.matchAll(textRegex)) {
    const raw = match[0].replace(/\s*Tj$/, '');
    items.push(decodePdfLiteralString(raw.slice(1, -1)));
  }

  const arrayRegex = /\[(.*?)\]\s*TJ/gs;
  for (const match of content.matchAll(arrayRegex)) {
    const fragments = [...match[1].matchAll(/\((?:\\.|[^\\)])*\)/g)].map(
      (fragment) => decodePdfLiteralString(fragment[0].slice(1, -1)),
    );
    if (fragments.length > 0) {
      items.push(fragments.join(' '));
    }
  }

  return items.map((item) => normalizeWhitespace(item)).filter(Boolean);
}

function extractPdfText(buffer: ArrayBuffer): string {
  const binary = Buffer.from(buffer).toString('latin1');
  const streamRegex =
    /<<(?:.|\r|\n)*?>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const chunks: string[] = [];

  for (const match of binary.matchAll(streamRegex)) {
    const completeMatch = match[0];
    const streamContent = match[1];
    const header = completeMatch.slice(0, completeMatch.indexOf('stream'));
    let streamBuffer = Buffer.from(streamContent, 'latin1');

    if (/\/Filter\s*\/FlateDecode/.test(header)) {
      try {
        streamBuffer = inflateSync(streamBuffer);
      } catch {
        continue;
      }
    }

    const extracted = extractTextOperators(streamBuffer.toString('latin1'));
    if (extracted.length > 0) {
      chunks.push(extracted.join(' '));
    }
  }

  return normalizeWhitespace(chunks.join(' '));
}

function sourceKindFromUrl(
  url: string,
  contentType: string | null,
): 'xml' | 'html' | 'pdf' {
  const normalizedUrl = url.toLowerCase();
  const normalizedType = contentType?.toLowerCase() ?? '';

  if (
    normalizedType.includes('pdf') ||
    normalizedUrl.endsWith('.pdf') ||
    normalizedUrl.includes('/pdf')
  ) {
    return 'pdf';
  }

  if (
    normalizedType.includes('xml') ||
    normalizedUrl.endsWith('.xml') ||
    normalizedUrl.includes('xml')
  ) {
    return 'xml';
  }

  return 'html';
}

export async function hydrateResearchPaperText(
  paper: ResearchPaperMetadata,
  fetchImpl: typeof fetch = fetch,
): Promise<HydratedResearchPaperText | null> {
  const metadata = paper.metadata as Record<string, unknown>;
  const candidates = [
    paper.xml_url,
    typeof metadata.full_text_xml_url === 'string'
      ? metadata.full_text_xml_url
      : null,
    paper.pdf_url,
    paper.source_url,
  ].filter(
    (value): value is string =>
      typeof value === 'string' && value.trim().length > 0,
  );

  for (const candidate of candidates) {
    try {
      const response = await fetchImpl(candidate, {
        headers: {
          accept:
            'application/xml, text/xml, text/html, application/pdf;q=0.9, text/plain;q=0.8',
        },
      });

      if (!response.ok) {
        continue;
      }

      const contentType = response.headers.get('content-type');
      const source = sourceKindFromUrl(candidate, contentType);
      const text =
        source === 'pdf'
          ? extractPdfText(await response.arrayBuffer())
          : stripMarkup(await response.text());

      if (text.length < 80) {
        continue;
      }

      return {
        contentType,
        fetchedFrom: candidate,
        source,
        text,
        trace: [
          {
            source: 'full_text',
            source_document_id: paper.source_document_id,
            text_span: truncate(text, 520),
            source_locator: `${source}:${candidate}`,
            page_number: source === 'pdf' ? 1 : null,
          },
        ],
      };
    } catch {
      continue;
    }
  }

  return null;
}
