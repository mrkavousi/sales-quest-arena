import { useState } from 'react';
import { Avatar } from '../components/art/Avatar';
import { Mascot } from '../components/art/Mascot';
import { Logo, StorageBanner } from '../components/AppLayout';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { buzz } from '../components/ui/motion';
import { useLanguage } from '../i18n/LanguageContext';
import type { MessageKey } from '../i18n/messages';
import { AVATAR_IDS } from '../game/progress';
import type { AvatarId } from '../game/types';
import { useGame } from '../state/GameContext';
import { useOptionalSession } from '../state/SessionContext';

/** First launch: pick a hero and enter the arena. */
export function WelcomePage() {
  const { completeOnboarding } = useGame();
  const session = useOptionalSession();
  const { t } = useLanguage();
  const [name, setName] = useState(() => (session?.user?.name ?? '').slice(0, 24));
  const [avatar, setAvatar] = useState<AvatarId>('fox');

  // Deliberately not a <form>: sandboxed embeds block form submission.
  const submit = () => {
    buzz(20);
    completeOnboarding(name, avatar);
  };

  return (
    <div className="welcome">
      <span className="welcome__blob welcome__blob--a" aria-hidden="true" />
      <span className="welcome__blob welcome__blob--b" aria-hidden="true" />
      <div className="welcome__card">
        <StorageBanner />
        <div className="welcome__top">
          <Logo />
          <LanguageSwitcher />
        </div>
        <div className="welcome__hero">
          <Mascot size={120} mood="cheer" />
          <div className="welcome__bubble">{t('welcome.greeting')}</div>
        </div>

        <fieldset className="welcome__field">
          <legend>{t('welcome.chooseHero')}</legend>
          <div className="avatar-picker" role="radiogroup" aria-label={t('common.avatar')}>
            {AVATAR_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={avatar === id}
                aria-label={t(`avatar.${id}` as MessageKey)}
                className={`avatar-picker__item${avatar === id ? ' is-selected' : ''}`}
                onClick={() => {
                  buzz(8);
                  setAvatar(id);
                }}
              >
                <Avatar id={id} size={56} animated={avatar === id} />
              </button>
            ))}
          </div>
        </fieldset>

        <label className="welcome__field">
          <span>{t('welcome.playerName')}</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder={t('welcome.placeholder')}
            autoComplete="given-name"
            enterKeyHint="go"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>

        <button className="btn btn--yellow btn--block btn--lg" type="button" onClick={submit}>
          {t('welcome.enter')}
        </button>
        <p className="welcome__fine">{t('welcome.saved')}</p>
      </div>
    </div>
  );
}
