import { CoinIcon, Icon } from './ui/Icon';
import { useLanguage } from '../i18n/LanguageContext';
import { navigate } from '../router';
import { useGame } from '../state/GameContext';

/** Small Arena tile that points at the demo store (device store, or the server store once it has loaded). */
export function StoreEntry() {
  const { store, stats } = useGame();
  const { t, n } = useLanguage();
  const available = store.status === 'available';
  return (
    <button
      type="button"
      className={`store-entry${available ? '' : ' is-off'}`}
      onClick={() => navigate('/store')}
    >
      <span className="store-entry__icon" aria-hidden="true"><Icon name="store" size={26} /></span>
      <span className="store-entry__body">
        <b>{t('store.title')}</b>
        <span>{t(available ? 'store.entryHint' : 'store.serverUnavailable')}</span>
      </span>
      <span className="store-entry__coins">
        <CoinIcon size={18} />
        <bdi dir="ltr">{n(stats.coins)}</bdi>
      </span>
    </button>
  );
}
