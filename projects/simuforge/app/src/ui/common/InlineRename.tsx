import { useEffect, useRef, useState } from 'react';

interface InlineRenameProps {
  initialName: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}

const MAX_NAME_LENGTH = 128;

export function InlineRename({ initialName, onCommit, onCancel }: InlineRenameProps) {
  const [value, setValue] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) {
      return;
    }
    input.focus();
    input.select();
  }, []);

  function finish(commit: boolean): void {
    if (finishedRef.current) {
      return;
    }
    finishedRef.current = true;

    const trimmed = value.trim();
    if (commit && trimmed.length > 0 && trimmed.length <= MAX_NAME_LENGTH) {
      onCommit(trimmed);
      return;
    }
    onCancel();
  }

  return (
    <input
      ref={inputRef}
      type="text"
      className="sf-inline-rename"
      aria-label={`Rename ${initialName}`}
      value={value}
      maxLength={MAX_NAME_LENGTH}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          finish(true);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          finish(false);
        }
      }}
      onBlur={() => finish(true)}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    />
  );
}
