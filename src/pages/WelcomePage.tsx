import { useState } from 'react';
import { Avatar } from '../components/art/Avatar';
import { Mascot } from '../components/art/Mascot';
import { Logo, StorageBanner } from '../components/AppLayout';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { InstallEntry } from '../components/InstallEntry';
import { buzz } from '../components/ui/motion';
import { AVATAR_IDS } from '../game/progress';
import type { AvatarId } from '../game/types';
import { useLanguage } from '../i18n/LanguageContext';
import { useGame } from '../state/GameContext';

/** First launch: pick a hero and enter the arena. */
export function WelcomePage() {
  const { completeOnboarding, persistence, mode, switchMode, account, changeAccount } = useGame();
  const { language, t } = useLanguage();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<AvatarId>('fox');
  const [saving, setSaving] = useState(false);

  // Deliberately not a <form>: sandboxed embeds block form submission.
  const submit = async () => {
    if (saving) return;
    setSaving(true);
    buzz(20);
    try { await completeOnboarding(name, avatar); } finally { setSaving(false); }
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
                aria-label={t(`avatar.${id}`)}
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
            dir={name ? 'auto' : language === 'fa' ? 'rtl' : 'ltr'}
            autoComplete="given-name"
            enterKeyHint="go"
            onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
          />
        </label>

        <button className="btn btn--yellow btn--block btn--lg" type="button" onClick={() => void submit()} disabled={saving}>
          {t(saving ? 'connection.savingAction' : 'welcome.enter')}
        </button>
        <p className="welcome__fine">
          {mode === 'server' ? <>{t('connection.serverBadge')} · <bdi>{account?.account_name}</bdi></> : t(persistence === 'saved' ? 'welcome.saved' : 'profile.notSaved')}
        </p>
        <p className="welcome__fine">{t(mode === 'server' ? 'connection.serverDescription' : 'connection.localDescription')}</p>
        {mode === 'local' ? (window.location.protocol !== 'file:' && <button className="linkbtn" type="button" onClick={() => switchMode('server')}>{t('connection.connect')}</button>) : (
          <div className="connection-profile__actions">
            <button className="linkbtn" type="button" onClick={changeAccount}>{t('connection.switchAccount')}</button>
            <button className="linkbtn" type="button" onClick={() => switchMode('local')}>{t('connection.useLocal')}</button>
          </div>
        )}
        <InstallEntry />
      </div>
    </div>
  );
}
