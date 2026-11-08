import { useEffect, useRef, useState } from 'react';

interface NumericFieldProps {
  id: string;
  label: string;
  value: number;
  min?: number;
  onCommit: (value: number) => void;
  helpText?: string;
}

function formatValue(value: number): string {
  if (!Number.isFinite(value)) return '';
  const rounded = Number(value.toFixed(6));
  return String(rounded);
}

export function NumericField({ id, label, value, min, onCommit, helpText }: NumericFieldProps) {
  const [draft, setDraft] = useState(formatValue(value));
  const [error, setError] = useState<string | null>(null);
  const editingRef = useRef(false);
  const committedRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) {
      setDraft(formatValue(value));
      setError(null);
    }
  }, [value]);

  function parseDraft(raw: string): number | null {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return null;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return null;
    if (min !== undefined && parsed < min) return null;
    return parsed;
  }

  function commit() {
    if (committedRef.current) {
      committedRef.current = false;
      return;
    }
    const parsed = parseDraft(draft);
    if (parsed === null) {
      setError(min !== undefined ? `Must be a finite number >= ${min}` : 'Must be a finite number');
      return;
    }
    setError(null);
    editingRef.current = false;
    committedRef.current = true;
    onCommit(parsed);
  }

  function revert() {
    setDraft(formatValue(value));
    setError(null);
    editingRef.current = false;
  }

  return (
    <div className="sf-numeric-field">
      <label className="sf-numeric-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        className={`sf-numeric-input ${error ? 'sf-numeric-input-error' : ''}`.trim()}
        value={draft}
        onFocus={() => {
          editingRef.current = true;
          committedRef.current = false;
        }}
        onChange={(event) => {
          setDraft(event.target.value);
          if (error) setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            commit();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            revert();
          }
        }}
        onBlur={() => {
          if (committedRef.current) {
            committedRef.current = false;
            editingRef.current = false;
            return;
          }
          commit();
        }}
        aria-invalid={error !== null}
        aria-describedby={error ? `${id}-error` : (helpText ? `${id}-help` : undefined)}
      />
      {error ? (
        <span id={`${id}-error`} className="sf-numeric-error" role="alert">{error}</span>
      ) : helpText ? (
        <span id={`${id}-help`} className="sf-numeric-help">{helpText}</span>
      ) : null}
    </div>
  );
}