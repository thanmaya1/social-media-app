import React, { useState } from 'react';

export default function Avatar({ src, alt, size = 40, className = '', children }) {
  const [errored, setErrored] = useState(false);
  const s = typeof size === 'number' ? `${size}px` : size;
  const initials = (() => {
    if (children)
      return String(children)
        .split(' ')
        .map((s) => s[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    if (alt)
      return alt
        .split(' ')
        .map((s) => s[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    return '';
  })();

  return (
    <div
      className={`avatar ${className}`}
      style={{
        width: s,
        height: s,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(90deg,var(--accent),var(--accent-2))',
        color: '#001',
        fontWeight: 700,
      }}
      aria-hidden={!!src && !errored ? 'false' : 'true'}
    >
      {src && !errored ? (
        <img
          src={src}
          alt={alt || 'avatar'}
          loading="lazy"
          onError={() => setErrored(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: `calc(${s} / 2.4)`,
            color: 'rgba(0,0,0,0.6)',
          }}
          aria-hidden="true"
        >
          {initials}
        </div>
      )}
    </div>
  );
}
