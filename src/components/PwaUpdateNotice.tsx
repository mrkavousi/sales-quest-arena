import { useLanguage } from '../i18n/LanguageContext';
import { usePwa } from '../pwa/PwaContext';
import { useRoute } from '../router';
import { useGame } from '../state/GameContext';
import { Icon } from './ui/Icon';

/** Never force a reload in the middle of a quest or while the player is editing. */
export function PwaUpdateNotice() {
  const { t } = useLanguage();
  const { persistence } = useGame();
  const { updateAvailable, applyUpdate, dismissUpdate } = usePwa();
  const route = useRoute();
  if (!updateAvailable || route.name === 'play' || route.name === 'result') return null;

  return (
    <aside className="pwa-update" role="status">
      <span className="pwa-update__icon"><Icon name="refresh" size={22} /></span>
      <div className="pwa-update__content">
        <strong>{t('pwa.updateTitle')}</strong>
        <p>{t('pwa.updateDescription')}</p>
        {persistence !== 'saved' && <p className="pwa-update__warning">{t('pwa.updateUnsaved')}</p>}
        <div className="pwa-update__actions">
          <button type="button" className="btn btn--yellow btn--sm" onClick={applyUpdate}>{t('pwa.updateAction')}</button>
          <button type="button" className="pwa-update__later" onClick={dismissUpdate}>{t('pwa.updateLater')}</button>
        </div>
      </div>
    </aside>
  );
}
