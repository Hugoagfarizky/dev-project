import { useEffect, useState } from 'react';
import { useStudioStore } from '../hooks/useStore.js';
import { pythonScripts, findPythonScript } from '../../python/validation.js';

interface PythonPanelProps {
  store: any;
}

export function PythonPanel({ store }: PythonPanelProps) {
  const state = useStudioStore(store, (s: any) => s);
  const project = state.project;
  const python = state.python ?? { selectedScriptId: null, runtimeStatus: 'idle', runtimeDetail: null, loadRequest: 0, lastRun: null };
  const scripts = pythonScripts(project.python);
  const selected = findPythonScript(project.python, python.selectedScriptId ?? '');
  const [nameDraft, setNameDraft] = useState('');

  useEffect(() => {
    store.dispatch({ type: 'python/load-runtime' });
  }, [store]);

  function createScript() {
    const name = nameDraft.trim() || `Script ${scripts.length + 1}`;
    store.dispatch({ type: 'python/create-script', name });
    setNameDraft('');
  }

  return (
    <details className="sf-python-panel" aria-label="Python scripts" style={{ flex: 'none' }} open>
      <summary>Python scripts</summary>
      <div className="sf-python-toolbar">
        <input
          type="text"
          placeholder="New script name"
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
        />
        <button type="button" onClick={createScript}>New Script</button>
        <button type="button" onClick={() => store.dispatch({ type: 'python/load-runtime' })}>
          Load Runtime
        </button>
        <span className="sf-python-status" data-testid="python-runtime-status">
          {python.runtimeStatus}
        </span>
      </div>
      <div className="sf-python-list">
        {scripts.map((script: any) => (
          <button
            key={script.id}
            type="button"
            className={script.id === python.selectedScriptId ? 'sf-python-script-selected' : ''}
            onClick={() => store.dispatch({ type: 'python/select-script', scriptId: script.id })}
          >
            {script.name}
          </button>
        ))}
      </div>
      {selected ? (
        <div className="sf-python-editor">
          <input
            type="text"
            value={selected.name}
            onChange={(event) =>
              store.dispatch({ type: 'python/rename-script', scriptId: selected.id, name: event.target.value })
            }
          />
          <textarea
            value={selected.source}
            onChange={(event) =>
              store.dispatch({ type: 'python/set-source', scriptId: selected.id, source: event.target.value })
            }
            rows={4}
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => store.dispatch({ type: 'python/delete-script', scriptId: selected.id })}
          >
            Delete
          </button>
        </div>
      ) : (
        <div className="sf-python-empty">No script selected.</div>
      )}
    </details>
  );
}
