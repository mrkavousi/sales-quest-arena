import { useEffect, useState, type CSSProperties } from 'react';
import { Mascot } from '../components/art/Mascot';
import { CATEGORY_ICON } from '../components/art/MissionArt';
import { Stars } from '../components/MissionBits';
import { CoinIcon, Icon, XpIcon } from '../components/ui/Icon';
import { toDateKey } from '../game/dates';
import type { HistoryEntry } from '../game/types';
import { formatDayLabel, formatServerDayLabel, formatTime } from '../i18n/locale';
import { useLanguage } from '../i18n/LanguageContext';
import { navigate } from '../router';
import { useGame } from '../state/GameContext';

function HistoryCard({ entry, index }: { entry: HistoryEntry; index: number }) {
  const { language, t, n } = useLanguage();
  const { missions, categories, mode } = useGame();
  const mission = missions.find((item) => item.id === entry.missionId);
  if (!mission) return null; // mission was removed from the catalog
  const meta = categories[mission.category];
  const note = mission.steps.find((s) => s.type === 'note');
  const noteText = note ? entry.answers[note.id] : undefined;

  return (
    <li className="hcard" style={{ '--c': meta.color, '--d': meta.dark, '--soft': meta.soft, '--i': Math.min(index, 8) } as CSSProperties}>
      <span className="hcard__icon">
        <Icon name={CATEGORY_ICON[mission.category]} size={24} />
        <span className="hcard__check"><Icon name="check" size={11} strokeWidth={4.5} /></span>
      </span>
      <div className="hcard__body">
        <div className="hcard__top">
          <h3>{mission.title}</h3>
          <time dateTime={entry.completedAt} dir="auto">{formatTime(language, entry.completedAt, mode === 'server' ? 'UTC' : undefined)}</time>
        </div>
        <div className="hcard__answers">
          {mission.steps.map((step) => {
            const value = entry.answers[step.id];
            if (value === undefined) return null;
            if (step.type === 'choice') {
              const option = step.options.find((o) => o.id === value);
              return option ? (
                <span key={step.id} className="hchip">
                  <span aria-hidden="true">{option.emoji}</span> {option.label}
                </span>
              ) : null;
            }
            if (step.type === 'rating') return <span key={step.id} className="hchip hchip--stars"><Stars value={value as number} size={13} /></span>;
            return null;
          })}
        </div>
        {typeof noteText === 'string' && noteText && <p className="hcard__note"><bdi>“{noteText}”</bdi></p>}
        <div className="hcard__rewards">
          <span className="hcard__reward"><XpIcon size={16} /><bdi dir="ltr">+{n(entry.rewards.xp)}</bdi> {t('common.xp')}</span>
          <span className="hcard__reward"><CoinIcon size={16} /><bdi dir="ltr">+{n(entry.rewards.coins)}</bdi></span>
          {entry.wasDaily && <span className="pill pill--daily">{t('history.dailyBonus')}</span>}
          {entry.levelAfter > entry.levelBefore && <span className="pill pill--level">{t('history.level', { level: entry.levelAfter })}</span>}
        </div>
      </div>
    </li>
  );
}

export function HistoryPage() {
  const { progress, stats, mode, todayKey, loadHistory } = useGame();
  const { language, t, n } = useLanguage();
  const [items, setItems] = useState<HistoryEntry[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(mode === 'server');
  useEffect(() => {
    if (mode !== 'server') return;
    let active = true;
    setLoading(true);
    void loadHistory().then((page) => {
      if (active && page) { setItems(page.items); setCursor(page.next_cursor); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mode, loadHistory]);
  const entries = mode === 'server' ? items ?? progress.history : progress.history;
  const more = async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const page = await loadHistory(cursor);
      if (page) { setItems((previous) => [...(previous ?? []), ...page.items]); setCursor(page.next_cursor); }
    } finally { setLoading(false); }
  };
  const groups: { key: string; label: string; entries: HistoryEntry[] }[] = [];
  for (const entry of entries) {
    const key = mode === 'server' ? new Date(entry.completedAt).toISOString().slice(0, 10) : toDateKey(new Date(entry.completedAt));
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.entries.push(entry);
    else groups.push({ key, label: mode === 'server' ? formatServerDayLabel(language, key, todayKey) : formatDayLabel(language, entry.completedAt), entries: [entry] });
  }
  const xpFromMissions = entries.reduce((sum, entry) => sum + entry.rewards.xp, 0);

  return (
    <div className="pagebody">
      <header className="pagehead">
        <h1>{t('history.title')}</h1>
        <p>{t('history.subtitle')}{mode === 'server' && <> · {t('connection.utc')}</>}</p>
      </header>

      {mode === 'server' && items === null && loading ? (
        <div className="empty" role="status">{t('connection.loading')}</div>
      ) : entries.length === 0 ? (
        <div className="empty">
          <Mascot size={110} mood="think" />
          <h2>{t('history.emptyTitle')}</h2>
          <p>{t('history.emptyText')}</p>
          <button className="btn btn--green" onClick={() => navigate('/')}>
            {t('history.goArena')}
          </button>
        </div>
      ) : (
        <>
          <div className="summary">
            <div><b>{n(stats.missionsCompleted)}</b><span>{t('nav.missions')}</span></div>
            <div><b>{n(xpFromMissions)}</b><span>{t('history.xpEarned')}</span></div>
            <div><b>{n(entries.filter((entry) => entry.flags.includes('order_received')).length)}</b><span>{t('history.orders')}</span></div>
          </div>
          {groups.map((group) => (
            <section key={group.key} className="hgroup">
              <h2 className="hgroup__label">{group.label}</h2>
              <ul className="hlist">
                {group.entries.map((entry, i) => (
                  <HistoryCard key={entry.id} entry={entry} index={i} />
                ))}
              </ul>
            </section>
          ))}
          {mode === 'server' && (cursor || items === null) && <div className="history-more"><p>{t('connection.historyPartial')}</p>{cursor && <button className="btn btn--ghost" onClick={() => void more()} disabled={loading}>{t(loading ? 'connection.savingAction' : 'connection.historyMore')}</button>}</div>}
        </>
      )}
    </div>
  );
}
