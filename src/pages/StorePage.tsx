import { useEffect, useState } from 'react';
import { Mascot } from '../components/art/Mascot';
import { CoinIcon, Icon } from '../components/ui/Icon';
import { Sheet } from '../components/ui/Sheet';
import { difficultyLabel } from '../i18n/content';
import { useLanguage } from '../i18n/LanguageContext';
import type { MessageKey } from '../i18n/messages';
import { navigate } from '../router';
import { useGame } from '../state/GameContext';
import type { StoreOffer } from '../game/store';

/** Offers and missions that ship with bundled translations; anything else shows the server's own text. */
const KNOWN_OFFERS = new Set(['vip-lounge-pass', 'midnight-route-pass', 'special-market-insight', 'special-sales-strategy']);
const KNOWN_MISSIONS = new Set(['vip-lounge', 'midnight-route', 'market-insight-special', 'sales-strategy-special']);

/**
 * Demo store, bought with the game's own coins. Never real money and never organizational points.
 * Device-only mode keeps its purchases in this browser; server mode reads offers, prices, ownership and the
 * balance from the backend and unlocks the special mission there.
 */
export function StorePage() {
  const { mode, store, progress, buyOffer, stats, toast, specialMissions, refreshStore } = useGame();
  const { language, t, n } = useLanguage();
  const [confirming, setConfirming] = useState<StoreOffer | null>(null);
  const [busy, setBusy] = useState(false);

  // Server mode: always show what the backend says right now (also after returning to this tab).
  useEffect(() => { void refreshStore(); }, [refreshStore]);

  const purchased = new Set(store.purchased);
  const offerTitle = (offer: StoreOffer) => (KNOWN_OFFERS.has(offer.id) ? t(`store.offer.${offer.id}.title` as MessageKey) : offer.title ?? offer.id);
  const offerDescription = (offer: StoreOffer) => (KNOWN_OFFERS.has(offer.id) ? t(`store.offer.${offer.id}.description` as MessageKey) : offer.description ?? '');
  const missionTitle = (offer: StoreOffer) => (KNOWN_MISSIONS.has(offer.missionId) ? t(`mission.${offer.missionId}.title` as MessageKey) : offer.missionTitle ?? offer.missionId);

  const buy = async () => {
    if (!confirming || busy) return;
    setBusy(true);
    try {
      const outcome = await buyOffer(confirming.id);
      if (outcome.ok) {
        setConfirming(null);
        toast(t('store.purchaseToast', { mission: offerTitle(confirming) }), 'success');
      } else {
        toast(t(`store.error.${outcome.error}` as MessageKey), 'warn');
        if (outcome.error === 'already_purchased' || outcome.error === 'insufficient_coins' || outcome.error === 'unknown_offer') setConfirming(null);
      }
    } finally {
      setBusy(false);
    }
  };

  const badge: MessageKey = store.status === 'loading'
    ? 'store.loading'
    : store.status === 'server-unavailable'
      ? 'store.serverUnavailable'
      : mode === 'server' ? 'store.serverBadge' : 'store.deviceOnly';

  return (
    <div className="pagebody store">
      <header className="pagehead">
        <h1>{t('store.title')}</h1>
        <p>{t(mode === 'server' ? 'store.serverSubtitle' : 'store.subtitle')}</p>
      </header>

      <p className={`store-badge store-badge--${store.status}`}>
        <Icon name="box" size={16} />
        {t(badge)}
      </p>

      <section className="panel store-wallet" aria-label={t('store.wallet')}>
        <div className="store-wallet__balance">
          <CoinIcon size={38} />
          <div>
            <b>{n(stats.coins)}</b>
            <span>{t('store.balance')}</span>
          </div>
        </div>
        <p>{t(mode === 'server' ? 'store.serverCoinsNote' : 'store.demoCoinsNote')}</p>
      </section>

      {store.status === 'loading' && <p className="store-empty-note" role="status">{t('store.loading')}</p>}

      {store.status === 'server-unavailable' && (
        <div className="empty store-offline" role="alert">
          <Mascot size={110} mood="sad" />
          <h2>{t('store.loadFailed')}</h2>
          <button className="btn btn--yellow" onClick={() => void refreshStore()}>{t('store.retry')}</button>
        </div>
      )}

      {store.status === 'available' && (
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
                    <b className="offer-card__title">{offerTitle(offer)}</b>
                    <span className="offer-card__desc">{offerDescription(offer)}</span>
                    <span className="offer-card__unlock">
                      <Icon name="target" size={14} />
                      {t('store.unlocksMission', { mission: missionTitle(offer) })}
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
              <span className="panel__count"><bdi dir="ltr">{n(specialMissions.length)}/{n(store.offers.length)}</bdi></span>
            </header>
            {specialMissions.length === 0 ? (
              <p className="store-empty-note">{t('store.unlockedEmpty')}</p>
            ) : (
              <ul className="store-specials">
                {specialMissions.map((mission) => (
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

          <p className="store-fine">{t(mode === 'server' ? 'store.serverFine' : 'store.fine')}</p>
        </>
      )}

      <Sheet open={confirming !== null} onClose={() => !busy && setConfirming(null)} label={t('store.confirmTitle')} size="sm">
        {confirming && (
          <div className="confirm store-confirm">
            <span className="store-confirm__emoji" aria-hidden="true">{confirming.emoji}</span>
            <h2>{t('store.confirmTitle')}</h2>
            <p>{t('store.confirmBody', {
              price: n(confirming.price),
              mission: offerTitle(confirming),
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
