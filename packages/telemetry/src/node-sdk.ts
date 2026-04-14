import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';

type TelemetryState = {
  initialized: boolean;
  sdk: NodeSDK | null;
  serviceName: string | null;
  shutdownHandlersRegistered: boolean;
};

const globalTelemetryState = globalThis as typeof globalThis & {
  __metrevTelemetryState?: TelemetryState;
};

const telemetryState = globalTelemetryState.__metrevTelemetryState ?? {
  initialized: false,
  sdk: null,
  serviceName: null,
  shutdownHandlersRegistered: false,
};

globalTelemetryState.__metrevTelemetryState = telemetryState;

function telemetryEnabled(): boolean {
  const enabled = (process.env.METREV_OTEL_ENABLED ?? 'true')
    .trim()
    .toLowerCase();

  if (enabled === 'false' || enabled === '0' || enabled === 'off') {
    return false;
  }

  return Boolean(
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim() ||
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?.trim(),
  );
}

function registerShutdownHandlers(): void {
  if (telemetryState.shutdownHandlersRegistered) {
    return;
  }

  const shutdown = () => {
    void shutdownTelemetry();
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  telemetryState.shutdownHandlersRegistered = true;
}

export async function initializeTelemetry(serviceName: string): Promise<void> {
  if (!telemetryEnabled() || telemetryState.initialized) {
    return;
  }

  const sdk = new NodeSDK({
    serviceName,
    traceExporter: new OTLPTraceExporter(),
  });

  telemetryState.sdk = sdk;
  telemetryState.serviceName = serviceName;
  await Promise.resolve(sdk.start());
  telemetryState.initialized = true;
  registerShutdownHandlers();
}

export async function shutdownTelemetry(): Promise<void> {
  if (!telemetryState.sdk) {
    return;
  }

  const sdk = telemetryState.sdk;

  telemetryState.sdk = null;
  telemetryState.serviceName = null;
  telemetryState.initialized = false;

  await sdk.shutdown();
}
