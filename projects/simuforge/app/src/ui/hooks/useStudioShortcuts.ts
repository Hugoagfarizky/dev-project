import { useEffect, useRef } from 'react';

interface StudioShortcutOptions {
  selectedEntityId: string | null;
  isRenaming: boolean;
  isDialogOpen: boolean;
  onRename: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  onCancelDialog: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable;
}

/**
 * I-05 keyboard floor: F2 renames the selected entity, Delete requests
 * deletion, and Escape cancels an open dialog. The full shortcut floor is
 * deferred to I-06.
 */
export function useStudioShortcuts(options: StudioShortcutOptions): void {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const current = optionsRef.current;

      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key === 'Escape') {
        if (current.isDialogOpen) {
          event.preventDefault();
          current.onCancelDialog();
        }
        return;
      }

      if (current.isRenaming || current.isDialogOpen) {
        return;
      }

      if (event.key === 'F2' && current.selectedEntityId) {
        event.preventDefault();
        current.onRename(current.selectedEntityId);
      } else if (event.key === 'Delete' && current.selectedEntityId) {
        event.preventDefault();
        current.onDeleteRequest(current.selectedEntityId);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
