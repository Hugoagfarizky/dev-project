import { useEffect, useRef, useState } from 'react';
import { BabylonRenderer } from '../../renderer/BabylonRenderer.js';
import { connectRendererToStore } from '../../app/wiring.js';
import type { RendererPort } from '../../renderer/RendererPort.js';
import type { StudioStore } from '../../editor/store.js';

interface ViewportHostProps {
  store?: StudioStore | undefined;
  rendererFactory?: (() => RendererPort) | undefined;
}

export function ViewportHost({ store, rendererFactory }: ViewportHostProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RendererPort | null>(null);
  const [diagnostics, setDiagnostics] = useState<{ webGlVersion: number; meshCount: number; entityCount: number; contextLost: boolean } | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const renderer = rendererFactory ? rendererFactory() : new BabylonRenderer();
    rendererRef.current = renderer;

    if (import.meta.env.DEV) {
      (window as unknown as { __simuforgeRenderer?: RendererPort }).__simuforgeRenderer = renderer;
    }

    let unsubscribeStore: (() => void) | undefined;
    let resizeObserver: ResizeObserver | undefined;

    renderer
      .mount(canvas)
      .then((result) => {
        setDiagnostics({
          webGlVersion: result.webGlVersion,
          meshCount: result.meshCount,
          entityCount: result.entityCount,
          contextLost: result.contextLost
        });
        setContextLost(result.contextLost);

        if (store) {
          const storeUnsubscribe = store.subscribe(() => {
            const next = renderer.getDiagnostics();
            setDiagnostics({
              webGlVersion: next.webGlVersion,
              meshCount: next.meshCount,
              entityCount: next.entityCount,
              contextLost: next.contextLost
            });
            setContextLost(next.contextLost);
          });
          const wiringUnsubscribe = connectRendererToStore(store, renderer, {
            onError(error) {
              if (error.code === 'RENDER_CONTEXT_LOST') setContextLost(true);
              if (error.code === 'RENDER_CONTEXT_RESTORED') setContextLost(false);
            }
          });
          unsubscribeStore = () => {
            storeUnsubscribe();
            wiringUnsubscribe();
          };
          const initial = renderer.getDiagnostics();
          setDiagnostics({
            webGlVersion: initial.webGlVersion,
            meshCount: initial.meshCount,
            entityCount: initial.entityCount,
            contextLost: initial.contextLost
          });
          setContextLost(initial.contextLost);
        }

        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            renderer.resize(entry.contentRect.width, entry.contentRect.height);
          }
        });
        resizeObserver.observe(container);
      })
      .catch((result: { code: string; message: string }) => {
        setError(result);
      });

    return () => {
      resizeObserver?.disconnect();
      unsubscribeStore?.();
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [store, rendererFactory]);

  return (
    <div className="sf-viewport-host" ref={containerRef}>
      <canvas ref={canvasRef} className="sf-viewport-canvas" />
      {diagnostics && !contextLost && !error ? (
        <div className="sf-viewport-diagnostics" aria-live="polite">
          WebGL {diagnostics.webGlVersion} · {diagnostics.meshCount}/{diagnostics.entityCount} meshes
        </div>
      ) : null}
      {error || contextLost ? (
        <div className="sf-webgl-fallback" role="alert">
          <h2>3D viewport unavailable</h2>
          <p>SimuForge needs WebGL 2 and hardware acceleration.</p>
          {error ? <p>{error.code}: {error.message}</p> : <p>WebGL context was lost.</p>}
        </div>
      ) : null}
    </div>
  );
}
