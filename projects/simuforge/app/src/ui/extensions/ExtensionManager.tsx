import { useState } from 'react';
import type { StudioStore } from '../../editor/store.js';
import {
  selectProjectExtensions,
  selectRuntimeExtensions,
  selectRuntimeStatus
} from '../../editor/selectors.js';
import { useStudioStore } from '../hooks/useStore.js';
import { Button } from '../common/Button.js';
import { createSampleExtensionEntry } from '../../extensions/samples.js';
import { validateExtensionEntry } from '../../extensions/validation.js';

interface ExtensionManagerProps {
  store: StudioStore;
}

/**
 * Project-local extension manager (Phase 10).
 *
 * Installing or removing an extension is an ordinary project edit: it marks the
 * document dirty and is blocked while the simulation is running. Worker
 * lifecycle is owned by the controller in the shell, not by this panel.
 */
export function ExtensionManager({ store }: ExtensionManagerProps) {
  const extensions = useStudioStore(store, selectProjectExtensions);
  const runtime = useStudioStore(store, selectRuntimeExtensions);
  const runtimeStatus = useStudioStore(store, selectRuntimeStatus);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const entries = extensions?.entries ?? [];

  function installSample(): void {
    store.dispatch({ type: 'extension/install', entry: createSampleExtensionEntry() });
  }

  function importExtension(): void {
    setImportError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(importText);
    } catch {
      setImportError('Extension JSON is not valid.');
      return;
    }
    const result = validateExtensionEntry(parsed);
    if (!result.ok || !result.entry) {
      setImportError(result.errors.join(' '));
      return;
    }
    store.dispatch({ type: 'extension/install', entry: result.entry });
    setImportText('');
  }

  return (
    <div className="sf-extension-manager" data-testid="extension-manager">
      <div className="sf-extension-toolbar">
        <Button variant="primary" size="sm" data-testid="install-sample-extension" onClick={installSample}>
          Install Sample Extension
        </Button>
        <span className="sf-extension-runtime" data-testid="extension-runtime-status">
          Runtime: {runtime.status} · {runtime.loadedExtensions.length} worker(s) · {runtime.tickCount} tick(s)
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="sf-inspector-note">No project-local extensions installed.</p>
      ) : (
        <ul className="sf-extension-list">
          {entries.map((entry) => {
            const loaded = runtime.loadedExtensions.includes(entry.manifest.id);
            return (
              <li
                key={entry.manifest.id}
                className="sf-extension-item"
                data-testid={`extension-item-${entry.manifest.id}`}
              >
                <div className="sf-extension-item-header">
                  <label className="sf-component-card-title">
                    <input
                      type="checkbox"
                      checked={entry.enabled}
                      disabled={runtimeStatus !== 'editing'}
                      aria-label={`Enable ${entry.manifest.name}`}
                      onChange={(event) =>
                        store.dispatch({
                          type: 'extension/set-enabled',
                          extensionId: entry.manifest.id,
                          enabled: event.target.checked
                        })
                      }
                    />
                    <span>
                      {entry.manifest.name} <small>v{entry.manifest.version}</small>
                    </span>
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={runtimeStatus !== 'editing'}
                    aria-label={`Remove ${entry.manifest.name}`}
                    onClick={() =>
                      store.dispatch({ type: 'extension/remove', extensionId: entry.manifest.id })
                    }
                  >
                    Remove
                  </Button>
                </div>
                <p className="sf-extension-meta">
                  {entry.manifest.components?.length ?? 0} component(s) ·{' '}
                  {entry.manifest.modules?.length ?? 0} module(s) ·{' '}
                  {(entry.manifest.permissions ?? []).join(', ') || 'no permissions'}
                </p>
                <p className="sf-extension-meta" data-testid={`extension-worker-${entry.manifest.id}`}>
                  {entry.enabled ? (loaded ? 'worker ready' : 'worker idle') : 'disabled'}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <div className="sf-extension-diagnostics">
        <h4 className="sf-inspector-heading">Diagnostics</h4>
        {runtime.diagnostics.length === 0 ? (
          <p className="sf-inspector-note">No extension diagnostics.</p>
        ) : (
          <ul>
            {runtime.diagnostics.map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${index}`} className={`sf-extension-diagnostic-${diagnostic.severity}`}>
                {diagnostic.code}: {diagnostic.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      <details className="sf-extension-import">
        <summary>Install from JSON</summary>
        <textarea
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          rows={6}
          placeholder='{"manifest": {...}, "source": "...", "enabled": true}'
          aria-label="Extension JSON"
        />
        {importError ? <p className="sf-extension-error">{importError}</p> : null}
        <Button variant="secondary" size="sm" onClick={importExtension}>
          Install
        </Button>
      </details>
    </div>
  );
}
