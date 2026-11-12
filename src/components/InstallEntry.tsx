import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { usePwa } from '../pwa/PwaContext';
import { Icon } from './ui/Icon';
import { Sheet } from './ui/Sheet';

/** Use the browser's install dialog when available, otherwise explain its menu. */
export function InstallEntry() {
  const { t } = useLanguage();
  const { canInstall, platform, promptInstall } = usePwa();
  const [guideOpen, setGuideOpen] = useState(false);
  if (!canInstall) return null;

  const guideKey = platform === 'ios' ? 'pwa.installGuideIos' : platform === 'android' ? 'pwa.installGuideAndroid' : 'pwa.installGuideOther';
  const install = async () => {
    if (!await promptInstall()) setGuideOpen(true);
  };

  return (
    <>
      <button type="button" className="install-entry" aria-label={t('pwa.installTitle')} onClick={() => void install()}>
        <span className="install-entry__icon"><Icon name="install" size={24} /></span>
        <span className="install-entry__text"><b>{t('pwa.installTitle')}</b><span>{t('pwa.installSubtitle')}</span></span>
        <Icon name="arrow" size={20} className="install-entry__arrow" />
      </button>
      <Sheet open={guideOpen} onClose={() => setGuideOpen(false)} label={t('pwa.installGuideTitle')} size="sm">
        <div className="install-guide">
          <span className="install-guide__icon"><Icon name="install" size={30} /></span>
          <h2>{t('pwa.installGuideTitle')}</h2>
          <p>{t(guideKey)}</p>
          <p className="install-guide__offline">{t('pwa.installGuideOffline')}</p>
          <button type="button" className="btn btn--green btn--block" onClick={() => setGuideOpen(false)}>{t('common.done')}</button>
        </div>
      </Sheet>
    </>
  );
}
