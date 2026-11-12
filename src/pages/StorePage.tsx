import { useState } from 'react';
import { Mascot } from '../components/art/Mascot';
import { CoinIcon, Icon } from '../components/ui/Icon';
import { Sheet } from '../components/ui/Sheet';
import { difficultyLabel } from '../i18n/content';
import { useLanguage } from '../i18n/LanguageContext';
import type { MessageKey } from '../i18n/messages';
import { navigate } from '../router';
import { useGame } from '../state/GameContext';
import { getSpecialMissionViews, type StoreOffer } from '../game/store';

/**
 * Demo store. Offers are bought with the game's own demo coins and unlock an
 * extra mission on this device. Nothing here is real money, and no purchase is
 * uploaded or treated as server-confirmed.
 */
export function StorePage() {
  const { mode, store, progress, buyOffer, stats, toast } = useGame();
  const { language, t, n } = useLanguage();
  const [confirming, setConfirming] = useState<StoreOffer | null>(null);
  const [busy, setBusy] = useState(false);

  const purchased = new Set(store.purchased);
  const unlocked = mode === 'local' ? getSpecialMissionViews(progress) : [];

  const buy = async () => {
    if (!confirming || busy) return;
    setBusy(true);
    try {
      const outcome = await buyOffer(confirming.id);
      if (outcome.ok) {
        setConfirming(null);
        toast(t('store.purchaseToast', { mission: t(`store.offer.${confirming.id}.title` as MessageKey) }), 'success');
      } else {
        toast(t(`store.error.${outcome.error}` as MessageKey), 'warn');
        if (outcome.error === 'already_purchased' || outcome.error === 'insufficient_coins') setConfirming(null);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pagebody store">
      <header className="pagehead">
        <h1>{t('store.title')}</h1>
        <p>{t('store.subtitle')}</p>
      </header>

      <p className={`store-badge store-badge--${store.status}`}>
        <Icon name="box" size={16} />
        {t(store.status === 'available' ? 'store.deviceOnly' : 'store.serverUnavailable')}
      </p>

      <section className="panel store-wallet" aria-label={t('store.wallet')}>
        <div className="store-wallet__balance">
          <CoinIcon size={38} />
          <div>
            <b>{n(stats.coins)}</b>
            <span>{t('store.balance')}</span>
          </div>
        </div>
        <p>{t('store.demoCoinsNote')}</p>
      </section>

      {mode === 'server' ? (
        <div className="empty store-offline">
          <Mascot size={110} mood="think" />
          <h2>{t('store.serverTitle')}</h2>
          <p>{t('store.serverDescription')}</p>
          <p className="store-offline__hint">{t('store.serverPlan')}</p>
        </div>
      ) : (
        <>
          <ul className="store-offers">
            {store.offers.map((offer) => {
              const bought = purchased.has(offer.id);
              const affordable = progress.coins >= offer.price;
              return (
                <li key={offer.id} className={`offer-card${bought ? ' is-owned' : ''}`}>
                  <span className="offer-card__art" aria-hidden="true">
                    <span className="offer-card__emoji">{offer.emoji}</span>
                    <span className="offer-card__tag">{t('store.demoTag')}</span>
                  </span>
                  <div className="offer-card__body">
                    <b className="offer-card__title">{t(`store.offer.${offer.id}.title` as MessageKey)}</b>
                    <span className="offer-card__desc">{t(`store.offer.${offer.id}.description` as MessageKey)}</span>
                    <span className="offer-card__unlock">
                      <Icon name="target" size={14} />
                      {t('store.unlocksMission', { mission: t(`mission.${offer.missionId}.title` as MessageKey) })}
                    </span>
                    <div className="offer-card__foot">
                      <span className="offer-card__price">
                        <CoinIcon size={18} />
                        <b>{n(offer.price)}</b>
                      </span>
                      {bought ? (
                        <button className="btn btn--green btn--sm" onClick={() => navigate(`/play/${offer.missionId}`)}>
                          {t('store.playUnlocked')}
                        </button>
                      ) : (
                        <button
                          className={`btn btn--sm ${affordable ? 'btn--yellow' : 'btn--ghost'}`}
                          onClick={() => setConfirming(offer)}
                          aria-describedby={affordable ? undefined : `offer-${offer.id}-short`}
                        >
                          {t(affordable ? 'store.buy' : 'store.needMore')}
                        </button>
                      )}
                    </div>
                    {!bought && !affordable && (
                      <span className="offer-card__short" id={`offer-${offer.id}-short`}>
                        {t('store.shortBy', { coins: offer.price - progress.coins })}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <section className="panel">
            <header className="panel__head">
              <h2>{t('store.unlockedTitle')}</h2>
              <span className="panel__count"><bdi dir="ltr">{n(unlocked.length)}/{n(store.offers.length)}</bdi></span>
            </header>
            {unlocked.length === 0 ? (
              <p className="store-empty-note">{t('store.unlockedEmpty')}</p>
            ) : (
              <ul className="store-specials">
                {unlocked.map((mission) => (
                  <li key={mission.id} className="store-specials__item">
                    <span className="store-specials__icon"><Icon name="target" size={20} /></span>
                    <div>
                      <b>{mission.title}</b>
                      <span>{t('store.specialMeta', {
                        difficulty: difficultyLabel(mission.difficulty, language),
                        minutes: mission.estimatedMinutes,
                      })}</span>
                    </div>
                    <button className="btn btn--green btn--sm" onClick={() => navigate(`/play/${mission.id}`)}>
                      {t(mission.status === 'completed' ? 'common.playAgain' : mission.status === 'in_progress' ? 'common.continue' : 'common.start')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="store-fine">{t('store.fine')}</p>
        </>
      )}

      <Sheet open={confirming !== null} onClose={() => !busy && setConfirming(null)} label={t('store.confirmTitle')} size="sm">
        {confirming && (
          <div className="confirm store-confirm">
            <span className="store-confirm__emoji" aria-hidden="true">{confirming.emoji}</span>
            <h2>{t('store.confirmTitle')}</h2>
            <p>{t('store.confirmBody', {
              price: n(confirming.price),
              mission: t(`store.offer.${confirming.id}.title` as MessageKey),
            })}</p>
            <p className="store-confirm__after">
              {t('store.confirmAfter', { coins: n(Math.max(0, progress.coins - confirming.price)) })}
            </p>
            <button className="btn btn--yellow btn--block" onClick={() => void buy()} disabled={busy}>
              {t(busy ? 'store.buying' : 'store.confirmBuy', { price: n(confirming.price) })}
            </button>
            <button className="btn btn--ghost btn--block" onClick={() => setConfirming(null)} disabled={busy}>
              {t('common.cancel')}
            </button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
