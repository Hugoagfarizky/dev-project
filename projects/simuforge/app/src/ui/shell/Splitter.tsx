import type { CSSProperties } from 'react';

interface SplitterProps {
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

export function Splitter({ orientation = 'vertical', className = '' }: SplitterProps) {
  const style: CSSProperties =
    orientation === 'vertical'
      ? { width: 1, minWidth: 1, alignSelf: 'stretch' }
      : { height: 1, minHeight: 1, width: '100%' };

  return <div className={`sf-splitter sf-splitter-${orientation} ${className}`.trim()} style={style} aria-hidden="true" />;
}
