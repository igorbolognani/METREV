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

const DEFAULT_FULL_TEXT_FETCH_TIMEOUT_MS = 1000;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function replaceCaseInsensitive(
  value: string,
  search: string,
  replacement: string,
): string {
  const lowerValue = value.toLowerCase();
  const lowerSearch = search.toLowerCase();
  let output = '';
  let cursor = 0;

  while (cursor < value.length) {
    const index = lowerValue.indexOf(lowerSearch, cursor);
    if (index === -1) {
      output += value.slice(cursor);
      break;
    }

    output += value.slice(cursor, index);
    output += replacement;
    cursor = index + search.length;
  }

  return output;
}

function decodeHtmlEntities(value: string): string {
  return [
    ['&nbsp;', ' '],
    ['&amp;', '&'],
    ['&lt;', '<'],
    ['&gt;', '>'],
    ['&quot;', '"'],
    ['&#39;', "'"],
  ].reduce(
    (current, [search, replacement]) =>
      replaceCaseInsensitive(current, search, replacement),
    value,
  );
}

function readTagName(value: string): string {
  let cursor = 0;
  while (cursor < value.length && /\s/.test(value[cursor])) {
    cursor += 1;
  }
  if (value[cursor] === '/') {
    cursor += 1;
  }

  const start = cursor;
  while (cursor < value.length && /[a-zA-Z0-9:-]/.test(value[cursor])) {
    cursor += 1;
  }

  return value.slice(start, cursor).toLowerCase();
}

function stripMarkup(value: string): string {
  let output = '';
  let cursor = 0;
  let ignoredTag: 'script' | 'style' | null = null;

  while (cursor < value.length) {
    if (value[cursor] !== '<') {
      if (!ignoredTag) {
        output += value[cursor];
      }
      cursor += 1;
      continue;
    }

    const tagEnd = value.indexOf('>', cursor + 1);
    if (tagEnd === -1) {
      break;
    }

    const tagBody = value.slice(cursor + 1, tagEnd);
    const tagName = readTagName(tagBody);
    const closing = tagBody.trimStart().startsWith('/');

    if (!ignoredTag && (tagName === 'script' || tagName === 'style')) {
      ignoredTag = tagName;
    } else if (ignoredTag && closing && tagName === ignoredTag) {
      ignoredTag = null;
    }

    output += ' ';
    cursor = tagEnd + 1;
  }

  return normalizeWhitespace(decodeHtmlEntities(output));
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
    const timeoutMs = Math.max(
      100,
      Number(
        process.env.RESEARCH_FULL_TEXT_FETCH_TIMEOUT_MS ??
          DEFAULT_FULL_TEXT_FETCH_TIMEOUT_MS,
      ),
    );
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(candidate, {
        headers: {
          accept:
            'application/xml, text/xml, text/html, application/pdf;q=0.9, text/plain;q=0.8',
        },
        signal: controller.signal,
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
            section_label: null,
            table_label: null,
            cell_locator: null,
            caption: null,
          },
        ],
      };
    } catch {
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}
