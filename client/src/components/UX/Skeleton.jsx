import React from 'react';

export default function Skeleton({ width = '100%', height = 12, style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        background: 'linear-gradient(90deg, #eee, #f5f5f5, #eee)',
        borderRadius: 4,
        ...style,
      }}
    />
  );
}
