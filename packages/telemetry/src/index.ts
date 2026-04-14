import { SpanStatusCode, trace } from '@opentelemetry/api';

export async function withSpan<T>(
  name: string,
  fn: () => Promise<T> | T,
  attributes: Record<string, boolean | number | string> = {},
): Promise<T> {
  const tracer = trace.getTracer('metrev-runtime');

  return tracer.startActiveSpan(name, async (span) => {
    Object.entries(attributes).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });

    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      if (error instanceof Error) {
        span.recordException(error);
      }

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'unknown error',
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
