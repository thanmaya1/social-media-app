import React, { useEffect, useRef } from 'react';

export default function Modal({ open, onClose, title, children, ariaLabel }) {
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement;
    // focus the dialog
    const el = dialogRef.current;
    const focusable =
      el &&
      el.querySelectorAll(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
    const first = focusable && focusable[0](first || el).focus();

    function onKey(e) {
      if (e.key === 'Escape') onClose && onClose();
      if (e.key === 'Tab') {
        // simple focus trap
        const nodes = Array.from(focusable || []);
        if (nodes.length === 0) {
          e.preventDefault();
          return;
        }
        const idx = nodes.indexOf(document.activeElement);
        if (e.shiftKey && idx === 0) {
          nodes[nodes.length - 1].focus();
          e.preventDefault();
        } else if (!e.shiftKey && idx === nodes.length - 1) {
          nodes[0].focus();
          e.preventDefault();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previouslyFocused.current && previouslyFocused.current.focus)
        previouslyFocused.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose && onClose();
      }}
    >
      <div
        className="modal dialog card modal-enter"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        ref={dialogRef}
        tabIndex={-1}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {title ? <h3 style={{ margin: 0 }}>{title}</h3> : <div />}
          <button
            aria-label="Close"
            className="btn btn-ghost btn-sm"
            onClick={() => onClose && onClose()}
          >
            ✕
          </button>
        </div>
        <div style={{ marginTop: 12 }}>{children}</div>
      </div>
    </div>
  );
}
