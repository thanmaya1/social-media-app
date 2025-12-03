import React from 'react';

export default function Skeleton({ height = 16, width = '100%', style = {}, radius = 4 }) {
  const base = {
    display: 'block',
    background: 'linear-gradient(90deg, #eee, #f5f5f5, #eee)',
    backgroundSize: '200% 100%',
    animation: 'skeleton-anim 1.2s linear infinite',
    borderRadius: radius,
    height,
    width,
    ...style,
  };
  return <div style={base} aria-hidden="true" />;
}

// add minimal keyframes via JS-injection so consumers don't need CSS edits
try {
  if (typeof document !== 'undefined' && !document.getElementById('skeleton-styles')) {
    const s = document.createElement('style');
    s.id = 'skeleton-styles';
    s.innerHTML = `@keyframes skeleton-anim { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`;
    document.head.appendChild(s);
  }
} catch (e) {
  // noop
}
