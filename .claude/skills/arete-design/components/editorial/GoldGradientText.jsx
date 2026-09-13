import React from 'react';

// The only gradient in the system: 135deg gold to light gold and back, on text.
export function GoldGradientText({ as = 'span', children, style }) {
  const Tag = as;
  return <Tag style={{
    background: 'linear-gradient(135deg,#c9a84c,#e8c96a 50%,#c9a84c)',
    WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', ...style
  }}>{children}</Tag>;
}
