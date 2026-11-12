import { useState } from 'react';
import { Avatar, AVATARS } from '../components/art/Avatar';
import { Mascot } from '../components/art/Mascot';
import { Logo, StorageBanner } from '../components/AppLayout';
import { buzz } from '../components/ui/motion';
import { AVATAR_IDS } from '../game/progress';
import type { AvatarId } from '../game/types';
import { useGame } from '../state/GameContext';

/** First launch: pick a hero and enter the arena. */
export function WelcomePage() {
  const { completeOnboarding } = useGame();
  const [name, setName] = useState('');
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
        <Logo />
        <div className="welcome__hero">
          <Mascot size={120} mood="cheer" />
          <div className="welcome__bubble">
            Hi, I&apos;m <b>Pip</b>! Turn your sales day into a quest. Ready?
          </div>
        </div>

        <fieldset className="welcome__field">
          <legend>Choose your hero</legend>
          <div className="avatar-picker" role="radiogroup" aria-label="Avatar">
            {AVATAR_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={avatar === id}
                aria-label={AVATARS[id].name}
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
          <span>Your player name</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="e.g. Alex"
            autoComplete="given-name"
            enterKeyHint="go"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>

        <button className="btn btn--yellow btn--block btn--lg" type="button" onClick={submit}>
          Enter the arena
        </button>
        <p className="welcome__fine">Your progress is saved on this device.</p>
      </div>
    </div>
  );
}
