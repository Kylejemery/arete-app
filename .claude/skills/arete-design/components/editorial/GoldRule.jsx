import React from 'react';

// The short centered gold rule that separates an academy heading from its body.
export function GoldRule({ width = 64, height = 1, align = 'left', style }) {
  return <div style={{
    width, height, background: 'var(--gold)',
    margin: align === 'center' ? '16px auto' : '16px 0', ...style
  }} />;
}
