import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { isStepAnswered, isStepRequired } from '../../game/missions';
import type { Answers, AnswerValue, Mission, MissionDraft } from '../../game/types';
import { keyboardDigit } from '../../i18n/locale';
import { useLanguage } from '../../i18n/LanguageContext';
import { navigate } from '../../router';
import { useGame } from '../../state/GameContext';
import { Mascot, type MascotMood } from '../art/Mascot';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { Icon } from '../ui/Icon';
import { buzz } from '../ui/motion';
import { Sheet } from '../ui/Sheet';
import { MissionStep } from './MissionStep';

/** A saved run can never resume past its first unanswered required challenge. */
function resumeIndex(mission: Mission, draft: MissionDraft | undefined): number {
  if (!draft) return 0;
  const firstGap = mission.steps.findIndex((s) => isStepRequired(mission, s) && !isStepAnswered(s, draft.answers));
  const max = firstGap === -1 ? mission.steps.length - 1 : firstGap;
  return Math.max(0, Math.min(draft.stepIndex, max));
}

function moodFor(mission: Mission, index: number, answers: Answers): MascotMood {
  const step = mission.steps[index];
  const value = answers[step.id];
  if (step.type === 'rating' && typeof value === 'number') return value >= 5 ? 'cheer' : value >= 4 ? 'happy' : value <= 2 ? 'sad' : 'idle';
  if (step.type === 'choice' && typeof value === 'string') {
    return step.options.find((o) => o.id === value)?.flags?.includes('order_received') ? 'cheer' : 'happy';
  }
  if (step.type === 'note') return isStepAnswered(step, answers) ? 'happy' : 'idle';
  return 'think';
}

export function MissionGameplay({ mission }: { mission: Mission }) {
  const { progress, mode, categories, persistence, sessionChanged, contractError, saveDraft, flushDraft, discardDraft, finishMission } = useGame();
  const { t, n } = useLanguage();
  const [answers, setAnswers] = useState<Answers>(() => progress.drafts[mission.id]?.answers ?? {});
  const [index, setIndex] = useState(() => resumeIndex(mission, progress.drafts[mission.id]));
  const [direction, setDirection] = useState<'fwd' | 'back'>('fwd');
  const [pauseOpen, setPauseOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const actionLock = useRef(false);

  const meta = categories[mission.category];
  const total = mission.steps.length;
  const step = mission.steps[index];
  const isLast = index === total - 1;
  const required = isStepRequired(mission, step);
  const answered = isStepAnswered(step, answers);
  const canContinue = (!required || answered) && !finishing;

  const setAnswer = useCallback(
    (value: AnswerValue) => {
      if (actionLock.current) return;
      const next = { ...answers, [step.id]: value };
      setAnswers(next);
      saveDraft(mission.id, index, next);
    },
    [answers, index, mission.id, saveDraft, step.id],
  );

  const goNext = useCallback(() => {
    if (!canContinue) return;
    buzz(12);
    if (!isLast) {
      setDirection('fwd');
      setIndex(index + 1);
      saveDraft(mission.id, index + 1, answers);
      return;
    }
    if (actionLock.current) return;
    actionLock.current = true;
    setFinishing(true);
    void finishMission(mission.id, answers).then((entry) => {
      if (entry) navigate(`/result/${entry.id}`, { replace: true });
    }).finally(() => { actionLock.current = false; setFinishing(false); });
  }, [answers, canContinue, finishMission, index, isLast, mission.id, saveDraft]);

  const goBack = useCallback(() => {
    if (index === 0 || actionLock.current) return;
    setDirection('back');
    setIndex(index - 1);
    saveDraft(mission.id, index - 1, answers);
  }, [answers, index, mission.id, saveDraft]);

  // Keyboard: 1-9 picks an option / star, Enter continues.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (pauseOpen || actionLock.current || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        goNext();
        return;
      }
      const digit = keyboardDigit(e.key);
      if (!Number.isInteger(digit) || digit < 1) return;
      if (step.type === 'choice' && step.options[digit - 1]) setAnswer(step.options[digit - 1].id);
      if (step.type === 'rating' && digit <= 5) setAnswer(digit);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, pauseOpen, setAnswer, step]);

  const cta = t(isLast ? 'play.complete' : step.type === 'note' && !answered ? 'play.skip' : 'common.continue');

  return (
    <div className="play" style={{ '--c': meta.color, '--d': meta.dark, '--soft': meta.soft } as CSSProperties}>
      <div className="play__stage">
        {mode === 'server' && (persistence !== 'saved' || contractError) && (
          <div className="play__sync" role="status">
            {contractError ? <>{t(contractError === 'UNSUPPORTED_VERSION' ? 'connection.errorVersion' : 'connection.errorResponse')} {t('connection.compatibilityPaused')}</> : t(persistence === 'saving' ? 'connection.saving' : sessionChanged ? 'connection.sessionChangedUnsaved' : 'connection.notSaved')}
            {(persistence !== 'saving' || contractError) && <button className="linkbtn" onClick={() => void flushDraft()}>{t('connection.retry')}</button>}
          </div>
        )}
        <header className="play__top">
          <button className="iconbtn" onClick={() => setPauseOpen(true)} disabled={finishing} aria-label={t('play.pause')}>
            <Icon name="close" size={22} />
          </button>
          <div className="play__progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index + (answered ? 1 : 0)} aria-label={t('common.missionProgress')}>
            {mission.steps.map((s, i) => (
              <span key={s.id} className={`play__seg${i < index || (i === index && answered) ? ' is-done' : ''}${i === index ? ' is-current' : ''}`}>
                <i />
              </span>
            ))}
          </div>
          <span className="play__count">
            <bdi dir="ltr">{n(index + 1)}/{n(total)}</bdi>
          </span>
        </header>

        <main className={`play__body play__body--${direction}`} key={step.id}>
          <div className="ask">
            <Mascot size={78} mood={moodFor(mission, index, answers)} className="ask__mascot" />
            <div className="ask__bubble">
              <span className="ask__eyebrow">
                {t('play.challenge', { number: index + 1 })}
                {!required && <em>{t('play.optional')}</em>}
              </span>
              <h1 className="ask__question">{step.question}</h1>
              {step.helper && <p className="ask__helper">{step.helper}</p>}
            </div>
          </div>
          <div className={finishing ? 'play__answers is-busy' : 'play__answers'} aria-disabled={finishing}>
            <MissionStep step={step} value={answers[step.id]} onChange={setAnswer} />
          </div>
        </main>

        <footer className="play__foot">
          {index > 0 && (
            <button className="btn btn--ghost btn--square" onClick={goBack} disabled={finishing} aria-label={t('play.previous')}>
              <Icon name="back" size={24} />
            </button>
          )}
          <button className={`btn btn--block btn--lg ${isLast ? 'btn--yellow' : 'btn--green'}${canContinue && answered ? ' is-ready' : ''}`} disabled={!canContinue} onClick={goNext}>
            {cta}
            {!isLast && <Icon name="arrow" size={20} strokeWidth={3} />}
          </button>
        </footer>
      </div>

      <Sheet open={pauseOpen} onClose={() => setPauseOpen(false)} label={t('play.pause')} size="sm" hideClose>
        <div className="confirm">
          <Mascot size={84} mood="idle" />
          <h2>{t('play.breakTitle')}</h2>
          <p>{t(mode === 'server' ? 'connection.pauseDescription' : 'play.breakDescription')}</p>
          <div className="pause__language">
            <span>{t('language.label')}</span>
            <LanguageSwitcher />
          </div>
          <button className="btn btn--green btn--block" onClick={() => setPauseOpen(false)} disabled={finishing}>
            {t('play.keepPlaying')}
          </button>
          <button className="btn btn--ghost btn--block" disabled={finishing} onClick={() => {
            if (actionLock.current) return;
            actionLock.current = true;
            setFinishing(true);
            void flushDraft().then((saved) => { if (saved) navigate('/'); }).finally(() => { actionLock.current = false; setFinishing(false); });
          }}>
            {t('play.saveExit')}
          </button>
          <button
            className="linkbtn linkbtn--danger"
            disabled={finishing}
            onClick={() => {
              if (actionLock.current) return;
              actionLock.current = true;
              setFinishing(true);
              void discardDraft(mission.id, index, answers).then((deleted) => { if (deleted) navigate('/'); }).finally(() => { actionLock.current = false; setFinishing(false); });
            }}
          >
            {t('play.discard')}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
