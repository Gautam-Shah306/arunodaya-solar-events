import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { en } from '../i18n/index.js';
import './Dialog.css';

export interface DialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly title?: string;
  readonly children: React.ReactNode;
  readonly 'aria-labelledby'?: string;
  readonly 'aria-describedby'?: string;
  readonly testId?: string;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
  testId = 'dialog',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Save active element to restore later
    if (document.activeElement instanceof HTMLElement) {
      previouslyFocusedRef.current = document.activeElement;
    }

    // Set inert on background root
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.setAttribute('inert', '');
    }

    // Move focus into the dialog
    const timer = setTimeout(() => {
      if (dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        const firstFocusable = focusables[0];
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          dialogRef.current.focus();
        }
      }
    }, 0);

    // Escape listener
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((el) => !el.hasAttribute('disabled') && !el.hidden);

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) {
          e.preventDefault();
          return;
        }

        const active = document.activeElement;

        if (!dialogRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
          return;
        }

        if (e.shiftKey) {
          if (active === first || active === dialogRef.current) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      if (rootEl) {
        rootEl.removeAttribute('inert');
      }
      if (previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>): void {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  const content = (
    <div
      className="ar-dialog-backdrop"
      onClick={handleBackdropClick}
      data-testid={`${testId}-backdrop`}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
        tabIndex={-1}
        className="ar-dialog"
        data-testid={testId}
      >
        <div className="ar-dialog-header">
          {title && (
            <h2 id={ariaLabelledby} className="ar-dialog-title">
              {title}
            </h2>
          )}
          <button
            type="button"
            className="ar-dialog-close-btn"
            onClick={onClose}
            aria-label={en.dialog.close}
            data-testid="dialog-close-button"
          >
            ✕
          </button>
        </div>
        <div className="ar-dialog-body" id={ariaDescribedby}>
          {children}
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }
  return content;
};
