import { useState } from 'react';
import type { QuestClaim, WeeklyQuest } from '../game/types';
import { jdate, n } from '../i18n';
import { useGame } from '../state/GameContext';
import { FlameIcon, Icon, XpIcon, type IconName } from './ui/Icon';
import { ProgressBar } from './ui/Progress';
import { Sheet } from './ui/Sheet';

const ICONS: Record<string, IconName> = { target: 'target', box: 'box', store: 'store', shield: 'shield' };
const STATUS_FA: Record<WeeklyQuest['status'], string> = { in_progress: 'در حال انجام', claimable: 'آمادهٔ دریافت', claimed: 'دریافت‌شده' };

function QuestIcon({ name }: { name: string }) {
  if (name === 'flame') return <FlameIcon size={26} />;
  return <Icon name={ICONS[name] ?? 'target'} size={24} strokeWidth={2.6} />;
}

interface QuestPanelProps {
  onClaimed: (claim: QuestClaim) => void;
  /** Show every quest as a full-width list (missions page) instead of the compact home panel. */
  title?: string;
}

/**
 * Weekly missions and challenges (DEMO). Progress is computed by the server; a claim is accepted
 * only after the backend confirms it, and rewards are game XP only (never org points or money).
 */
export function QuestPanel({ onClaimed, title = 'مأموریت و چالش‌های هفتگی' }: QuestPanelProps) {
  const { quests, claimQuest, toast } = useGame();
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  if (!quests) return null;

  const claimedCount = quests.quests.filter((quest) => quest.claimed).length;
  const opened = quests.quests.find((quest) => quest.id === openId) ?? null;

  const claim = async (quest: WeeklyQuest) => {
    if (busy) return;
    setBusy(quest.id);
    const result = await claimQuest(quest.id);
    setBusy(null);
    if (result) {
      toast(`+${n(result.xp)} امتیاز تجربه · ${quest.title}`, 'success');
      onClaimed(result);
    }
  };

  const label = (quest: WeeklyQuest) => (quest.status === 'claimed' ? 'دریافت شد' : quest.status === 'claimable' ? (busy === quest.id ? 'در حال دریافت…' : 'دریافت پاداش') : 'در حال انجام');

  return (
    <section className="panel quests" aria-labelledby="quests-title">
      <header className="panel__head">
        <h2 id="quests-title">{title}</h2>
        <span className="demo-tag">نمایشی</span>
      </header>
      <p className="quests__meta">
        هفتهٔ {jdate(quests.weekStart)} تا {jdate(quests.weekEnd)} · {n(claimedCount)} از {n(quests.quests.length)} دریافت شد
      </p>
      <ul className="quests__list">
        {quests.quests.map((quest) => {
          const ratio = quest.target > 0 ? quest.progress / quest.target : 0;
          return (
            <li key={quest.id} className={`quest quest--${quest.status}`} data-testid={`quest-${quest.id}`}>
              <span className="quest__icon" aria-hidden="true">
                <QuestIcon name={quest.icon} />
              </span>
              <div className="quest__body">
                <div className="quest__title">
                  <button type="button" className="quest__open" onClick={() => setOpenId(quest.id)}>
                    {quest.title}
                  </button>
                  <span className="quest__xp">+{n(quest.rewardXp)} امتیاز</span>
                </div>
                <p>{quest.description}</p>
                <div className="quest__progress">
                  <ProgressBar value={ratio} tone={quest.status === 'claimable' ? 'green' : 'blue'} label={`پیشرفت ${quest.title}`} />
                  <small>
                    {n(quest.progress)}/{n(quest.target)}
                  </small>
                  <button
                    type="button"
                    className={`quest__claim${quest.status === 'claimable' ? ' is-ready' : ''}`}
                    disabled={quest.status !== 'claimable' || busy !== null}
                    onClick={() => void claim(quest)}
                    data-testid={`claim-${quest.id}`}
                  >
                    {label(quest)}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Sheet open={opened !== null} onClose={() => setOpenId(null)} label={opened?.title ?? ''} size="sm">
        {opened && (
          <div className="qdetail">
            <span className="qdetail__icon" aria-hidden="true">
              <QuestIcon name={opened.icon} />
            </span>
            <h2>{opened.title}</h2>
            <dl className="qdetail__facts">
              <div>
                <dt>هدف</dt>
                <dd>{opened.description}</dd>
              </div>
              <div>
                <dt>پیشرفت</dt>
                <dd>
                  {n(opened.progress)} از {n(opened.target)}
                </dd>
              </div>
              <div>
                <dt>پاداش</dt>
                <dd>
                  <XpIcon size={16} /> {n(opened.rewardXp)} امتیاز تجربه
                </dd>
              </div>
              <div>
                <dt>وضعیت</dt>
                <dd>{STATUS_FA[opened.status]}</dd>
              </div>
            </dl>
            <ProgressBar value={opened.target > 0 ? opened.progress / opened.target : 0} tone={opened.status === 'claimable' ? 'green' : 'blue'} size="lg" label="پیشرفت چالش" />
            <p className="qdetail__note">پیشرفت را سرور از مأموریت‌های انجام‌شدهٔ همین هفته محاسبه می‌کند و پاداش فقط امتیاز تجربهٔ بازی است.</p>
            {opened.status === 'claimable' ? (
              <button className="btn btn--green btn--block" disabled={busy !== null} onClick={() => void claim(opened).then(() => setOpenId(null))}>
                دریافت {n(opened.rewardXp)} امتیاز
              </button>
            ) : (
              <button className="btn btn--ghost btn--block" onClick={() => setOpenId(null)}>
                بستن
              </button>
            )}
          </div>
        )}
      </Sheet>
    </section>
  );
}
