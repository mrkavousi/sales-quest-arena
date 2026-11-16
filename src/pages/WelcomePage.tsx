import { useState } from 'react';
import { Avatar, AVATARS } from '../components/art/Avatar';
import { Mascot } from '../components/art/Mascot';
import { Logo, StorageBanner } from '../components/AppLayout';
import { buzz } from '../components/ui/motion';
import { AVATAR_IDS } from '../game/progress';
import type { AvatarId } from '../game/types';
import { useGame } from '../state/GameContext';
import { useOptionalSession } from '../state/SessionContext';

/** First launch: pick a hero and enter the arena. */
export function WelcomePage() {
  const { completeOnboarding } = useGame();
  const session = useOptionalSession();
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
        <Logo />
        <div className="welcome__hero">
          <Mascot size={120} mood="cheer" />
          <div className="welcome__bubble">
            سلام، من <b>پیپ</b> هستم! روز فروش شما را به یک ماجراجویی تبدیل می‌کنم. آماده‌اید؟
          </div>
        </div>

        <fieldset className="welcome__field">
          <legend>قهرمان خود را انتخاب کنید</legend>
          <div className="avatar-picker" role="radiogroup" aria-label="آواتار">
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
          <span>نام بازیکن</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="مثلاً: سارا"
            autoComplete="given-name"
            enterKeyHint="go"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>

        <button className="btn btn--yellow btn--block btn--lg" type="button" onClick={submit}>
          ورود به عرصه
        </button>
        <p className="welcome__fine">پیشرفت شما ذخیره می‌شود.</p>
      </div>
    </div>
  );
}
