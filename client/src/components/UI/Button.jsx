import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) {
  const cls = `btn btn-${variant} btn-${size} ${className}`.trim();
  const { 'aria-pressed': ariaPressed } = props;
  return (
    <button className={cls} aria-pressed={ariaPressed} {...props}>
      {children}
    </button>
  );
}
