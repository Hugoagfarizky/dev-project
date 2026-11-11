import type { Graph, GraphDocument, GraphParseResult } from './types.ts';
import { GRAPH_FORMAT, GRAPH_SCHEMA_VERSION } from './types.ts';
import { validateGraph } from './validation.ts';

export function serializeGraphDocument(graph: Graph): string {
  const document: GraphDocument = {
    format: GRAPH_FORMAT,
    schemaVersion: GRAPH_SCHEMA_VERSION,
    graph
  };
  return JSON.stringify(document, null, 2);
}

export function parseGraphDocument(text: string): GraphParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: { code: 'GRAPH_PARSE_ERROR', message: 'Graph document is not valid JSON.' } };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: { code: 'GRAPH_INVALID_DOCUMENT', message: 'Graph document must be an object.' } };
  }

  const document = parsed as Record<string, unknown>;
  if (document.format !== GRAPH_FORMAT) {
    return { ok: false, error: { code: 'GRAPH_INVALID_FORMAT', message: 'Unsupported graph document format.' } };
  }
  if (document.schemaVersion !== GRAPH_SCHEMA_VERSION) {
    return { ok: false, error: { code: 'GRAPH_UNSUPPORTED_SCHEMA', message: 'Unsupported graph schema version.' } };
  }
  if (typeof document.graph !== 'object' || document.graph === null) {
    return { ok: false, error: { code: 'GRAPH_INVALID_GRAPH', message: 'Graph document must contain a graph.' } };
  }

  const graph = document.graph as Graph;
  const validation = validateGraph(graph, { entities: [] });
  if (!validation.valid) {
    return {
      ok: false,
      error: {
        code: validation.diagnostics[0]?.code ?? 'GRAPH_INVALID',
        message: validation.diagnostics[0]?.message ?? 'Graph is invalid.'
      }
    };
  }

  return { ok: true, value: document as unknown as GraphDocument };
}