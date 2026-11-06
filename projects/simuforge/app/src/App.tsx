import { createStudioStore } from './editor/store.js';
import { createDefaultEditorState } from './editor/state.js';
import { createEmptyProject } from './editor/state.js';
import { StudioShell } from './ui/shell/StudioShell.js';

const now = new Date().toISOString();
const store = createStudioStore({
  project: createEmptyProject(crypto.randomUUID(), 'Untitled Simulation', now),
  editor: createDefaultEditorState(),
  persistence: {
    revision: 1,
    savedRevision: 0,
    status: 'dirty',
    lastSavedAt: null,
    lastError: null
  },
  logs: []
});

export default function App() {
  return <StudioShell store={store} />;
}
