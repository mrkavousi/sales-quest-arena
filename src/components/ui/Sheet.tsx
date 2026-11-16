import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { Icon } from './Icon';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  /** Hide the round close button (e.g. for confirm dialogs). */
  hideClose?: boolean;
  size?: 'md' | 'sm';
}

/** Bottom sheet on phones, centered dialog on larger screens. */
export function Sheet({ open, onClose, label, children, hideClose = false, size = 'md' }: SheetProps) {
  const { t } = useLanguage();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="sheet" role="dialog" aria-modal="true" aria-label={label}>
      <div className="sheet__backdrop" onClick={onClose} />
      <div className={`sheet__panel sheet__panel--${size}`}>
        <span className="sheet__grip" aria-hidden="true" />
        {!hideClose && (
          <button className="iconbtn sheet__close" onClick={onClose} aria-label={t('common.close')}>
            <Icon name="close" size={20} />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
