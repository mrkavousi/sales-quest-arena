import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { CATEGORIES, isStepAnswered, isStepRequired } from '../../game/missions';
import type { Answers, AnswerValue, Mission, MissionDraft } from '../../game/types';
import { navigate } from '../../router';
import { useGame } from '../../state/GameContext';
import { Mascot, type MascotMood } from '../art/Mascot';
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
  const { progress, saveDraft, discardDraft, finishMission } = useGame();
  const [answers, setAnswers] = useState<Answers>(() => progress.drafts[mission.id]?.answers ?? {});
  const [index, setIndex] = useState(() => resumeIndex(mission, progress.drafts[mission.id]));
  const [direction, setDirection] = useState<'fwd' | 'back'>('fwd');
  const [pauseOpen, setPauseOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const meta = CATEGORIES[mission.category];
  const total = mission.steps.length;
  const step = mission.steps[index];
  const isLast = index === total - 1;
  const required = isStepRequired(mission, step);
  const answered = isStepAnswered(step, answers);
  const canContinue = (!required || answered) && !finishing;

  const setAnswer = useCallback(
    (value: AnswerValue) => {
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
    setFinishing(true);
    const entry = finishMission(mission.id, answers);
    if (entry) navigate(`/result/${entry.id}`, { replace: true });
    else setFinishing(false);
  }, [answers, canContinue, finishMission, index, isLast, mission.id, saveDraft]);

  const goBack = useCallback(() => {
    if (index === 0) return;
    setDirection('back');
    setIndex(index - 1);
    saveDraft(mission.id, index - 1, answers);
  }, [answers, index, mission.id, saveDraft]);

  // Keyboard: 1-9 picks an option / star, Enter continues.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (pauseOpen || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        goNext();
        return;
      }
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1) return;
      if (step.type === 'choice' && step.options[n - 1]) setAnswer(step.options[n - 1].id);
      if (step.type === 'rating' && n <= 5) setAnswer(n);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, pauseOpen, setAnswer, step]);

  const cta = isLast ? 'Complete mission' : step.type === 'note' && !answered ? 'Skip' : 'Continue';

  return (
    <div className="play" style={{ '--c': meta.color, '--d': meta.dark, '--soft': meta.soft } as CSSProperties}>
      <div className="play__stage">
        <header className="play__top">
          <button className="iconbtn" onClick={() => setPauseOpen(true)} aria-label="Pause mission">
            <Icon name="close" size={22} />
          </button>
          <div className="play__progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index + (answered ? 1 : 0)} aria-label="Mission progress">
            {mission.steps.map((s, i) => (
              <span key={s.id} className={`play__seg${i < index || (i === index && answered) ? ' is-done' : ''}${i === index ? ' is-current' : ''}`}>
                <i />
              </span>
            ))}
          </div>
          <span className="play__count">
            {index + 1}/{total}
          </span>
        </header>

        <main className={`play__body play__body--${direction}`} key={step.id}>
          <div className="ask">
            <Mascot size={78} mood={moodFor(mission, index, answers)} className="ask__mascot" />
            <div className="ask__bubble">
              <span className="ask__eyebrow">
                Challenge {index + 1}
                {!required && <em>Optional</em>}
              </span>
              <h1 className="ask__question">{step.question}</h1>
              {step.helper && <p className="ask__helper">{step.helper}</p>}
            </div>
          </div>
          <MissionStep step={step} value={answers[step.id]} onChange={setAnswer} />
        </main>

        <footer className="play__foot">
          {index > 0 && (
            <button className="btn btn--ghost btn--square" onClick={goBack} aria-label="Previous challenge">
              <Icon name="back" size={24} />
            </button>
          )}
          <button className={`btn btn--block btn--lg ${isLast ? 'btn--yellow' : 'btn--green'}${canContinue && answered ? ' is-ready' : ''}`} disabled={!canContinue} onClick={goNext}>
            {cta}
            {!isLast && <Icon name="arrow" size={20} strokeWidth={3} />}
          </button>
        </footer>
      </div>

      <Sheet open={pauseOpen} onClose={() => setPauseOpen(false)} label="Pause mission" size="sm" hideClose>
        <div className="confirm">
          <Mascot size={84} mood="idle" />
          <h2>Take a break?</h2>
          <p>Your answers are saved. You can pick this mission up right where you left off.</p>
          <button className="btn btn--green btn--block" onClick={() => setPauseOpen(false)}>
            Keep playing
          </button>
          <button className="btn btn--ghost btn--block" onClick={() => navigate('/')}>
            Save &amp; exit
          </button>
          <button
            className="linkbtn linkbtn--danger"
            onClick={() => {
              discardDraft(mission.id);
              navigate('/');
            }}
          >
            Quit and discard answers
          </button>
        </div>
      </Sheet>
    </div>
  );
}
