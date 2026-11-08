import { useEffect, useRef } from 'react';

interface StudioShortcutOptions {
  selectedEntityId: string | null;
  isRenaming: boolean;
  isDialogOpen: boolean;
  isDragging: () => boolean;
  cancelDrag: () => void;
  gridVisible: boolean;
  onRename: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  onCancelDialog: () => void;
  onSetGizmoMode: (mode: 'translate' | 'rotate' | 'scale') => void;
  onFrameSelection: () => void;
  onFrameWorld: () => void;
  onToggleGrid: (visible: boolean) => void;
  onClearSelection: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable;
}

export function useStudioShortcuts(options: StudioShortcutOptions): void {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const current = optionsRef.current;

      // Allow text fields to handle their own keys.
      if (isEditableTarget(event.target)) {
        return;
      }

      // Escape: context-sensitive, one layer at a time.
      if (event.key === 'Escape') {
        if (current.isDialogOpen) {
          event.preventDefault();
          current.onCancelDialog();
          return;
        }
        if (current.isDragging()) {
          event.preventDefault();
          current.cancelDrag();
          return;
        }
        if (current.isRenaming) {
          return;
        }
        if (current.selectedEntityId !== null) {
          event.preventDefault();
          current.onClearSelection();
        }
        return;
      }

      if (current.isRenaming || current.isDialogOpen) {
        return;
      }

      // Gizmo mode shortcuts.
      if (event.key === 'w' || event.key === 'W') {
        event.preventDefault();
        current.onSetGizmoMode('translate');
        return;
      }
      if (event.key === 'e' || event.key === 'E') {
        event.preventDefault();
        current.onSetGizmoMode('rotate');
        return;
      }
      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        current.onSetGizmoMode('scale');
        return;
      }

      // Frame shortcuts.
      if (event.key === 'f' || event.key === 'F') {
        if (event.shiftKey) {
          event.preventDefault();
          current.onFrameWorld();
        } else {
          event.preventDefault();
          current.onFrameSelection();
        }
        return;
      }

      // Grid toggle.
      if (event.key === 'g' || event.key === 'G') {
        event.preventDefault();
        current.onToggleGrid(!current.gridVisible);
        return;
      }

      // Rename.
      if (event.key === 'F2' && current.selectedEntityId) {
        event.preventDefault();
        current.onRename(current.selectedEntityId);
        return;
      }

      // Delete.
      if (event.key === 'Delete' && current.selectedEntityId) {
        event.preventDefault();
        current.onDeleteRequest(current.selectedEntityId);
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}