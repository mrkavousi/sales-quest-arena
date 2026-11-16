import { useState } from 'react';
import type { QuestClaim, WeeklyQuest } from '../game/types';
import { useGame } from '../state/GameContext';
import { FlameIcon, Icon, type IconName } from './ui/Icon';
import { ProgressBar } from './ui/Progress';

const ICONS: Record<string, IconName> = { target: 'target', box: 'box', store: 'store' };

function QuestIcon({ name }: { name: string }) {
  if (name === 'flame') return <FlameIcon size={26} />;
  return <Icon name={ICONS[name] ?? 'target'} size={24} strokeWidth={2.6} />;
}

/** "2026-11-16" → "11/16" (the server sends Gregorian dates; the week is ISO, Monday to Sunday). */
function shortDay(iso: string): string {
  return iso.slice(5).replace('-', '/');
}

interface QuestPanelProps {
  onClaimed: (claim: QuestClaim) => void;
}

/**
 * Weekly quests (DEMO). Progress is computed by the server; a claim is accepted only after the
 * backend confirms it, and rewards are game XP only (never organizational points or money).
 */
export function QuestPanel({ onClaimed }: QuestPanelProps) {
  const { quests, claimQuest, toast } = useGame();
  const [busy, setBusy] = useState<string | null>(null);
  if (!quests) return null;

  const claimedCount = quests.quests.filter((quest) => quest.claimed).length;

  const claim = async (quest: WeeklyQuest) => {
    if (busy) return;
    setBusy(quest.id);
    const result = await claimQuest(quest.id);
    setBusy(null);
    if (result) {
      toast(`+${result.xp} XP · ${quest.title}`, 'success');
      onClaimed(result);
    }
  };

  return (
    <section className="panel quests" aria-labelledby="quests-title">
      <header className="panel__head">
        <h2 id="quests-title">Weekly quests</h2>
        <span className="demo-tag">DEMO</span>
      </header>
      <p className="quests__meta">
        Week {quests.weekKey} · {shortDay(quests.weekStart)} – {shortDay(quests.weekEnd)} · {claimedCount}/{quests.quests.length} claimed
      </p>
      <ul className="quests__list">
        {quests.quests.map((quest) => {
          const ratio = quest.target > 0 ? quest.progress / quest.target : 0;
          const label =
            quest.status === 'claimed' ? 'Claimed' : quest.status === 'claimable' ? (busy === quest.id ? 'Claiming…' : 'Claim') : 'In progress';
          return (
            <li key={quest.id} className={`quest quest--${quest.status}`}>
              <span className="quest__icon" aria-hidden="true">
                <QuestIcon name={quest.icon} />
              </span>
              <div className="quest__body">
                <div className="quest__title">
                  <b>{quest.title}</b>
                  <span className="quest__xp">+{quest.rewardXp} XP</span>
                </div>
                <p>{quest.description}</p>
                <div className="quest__progress">
                  <ProgressBar value={ratio} tone={quest.status === 'claimable' ? 'green' : 'blue'} label={`${quest.title} progress`} />
                  <small>
                    {quest.progress}/{quest.target}
                  </small>
                  <button
                    type="button"
                    className={`quest__claim${quest.status === 'claimable' ? ' is-ready' : ''}`}
                    disabled={quest.status !== 'claimable' || busy !== null}
                    onClick={() => void claim(quest)}
                  >
                    {label}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
