const LAYOUT_KEY = 'simuforge.layout.v1';
const LAST_PROJECT_KEY = 'simuforge.last-project.v1';

export interface LayoutState {
  preset?: string;
  leftWidth?: number;
  rightWidth?: number;
  consoleHeight?: number;
  collapsed?: Record<string, boolean>;
}

export class LayoutStorage {
  loadLayout(): LayoutState | null {
    try {
      const raw = localStorage.getItem(LAYOUT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return null;
      return parsed as LayoutState;
    } catch {
      return null;
    }
  }

  saveLayout(state: LayoutState): void {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(state));
    } catch {
      // best effort
    }
  }

  loadLastProjectId(): string | null {
    try {
      return localStorage.getItem(LAST_PROJECT_KEY);
    } catch {
      return null;
    }
  }

  saveLastProjectId(id: string | null): void {
    try {
      if (id === null) localStorage.removeItem(LAST_PROJECT_KEY);
      else localStorage.setItem(LAST_PROJECT_KEY, id);
    } catch {
      // best effort
    }
  }
}