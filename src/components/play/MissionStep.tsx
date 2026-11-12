import type { CSSProperties } from 'react';
import type { AnswerValue, ChoiceStep, MissionStep as Step, NoteStep, RatingStep } from '../../game/types';
import { useLanguage } from '../../i18n/LanguageContext';
import { Icon, StarIcon } from '../ui/Icon';
import { buzz } from '../ui/motion';

interface StepProps<S extends Step> {
  step: S;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
}

/* ---------- Choice ---------- */

function ChoiceStepView({ step, value, onChange }: StepProps<ChoiceStep>) {
  const { n } = useLanguage();
  return (
    <div className={`options${step.options.length <= 3 ? ' options--roomy' : ''}`} role="radiogroup" aria-label={step.question}>
      {step.options.map((option, i) => {
        const selected = value === option.id;
        const bonus = option.flags?.includes('order_received');
        return (
          <button
            key={option.id}
            role="radio"
            aria-checked={selected}
            className={`option${selected ? ' is-selected' : ''}${bonus ? ' option--bonus' : ''}`}
            style={{ '--i': i } as CSSProperties}
            onClick={() => {
              buzz(10);
              onChange(option.id);
            }}
          >
            <span className="option__emoji" aria-hidden="true">{option.emoji}</span>
            <span className="option__text">
              <span className="option__label">{option.label}</span>
              {option.hint && <span className="option__hint">{option.hint}</span>}
            </span>
            <span className="option__key" aria-hidden="true">{selected ? <Icon name="check" size={16} strokeWidth={4} /> : n(i + 1)}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Rating ---------- */

const FACES = ['😣', '😕', '🙂', '😄', '🤩'];

function RatingStepView({ step, value, onChange }: StepProps<RatingStep>) {
  const { t } = useLanguage();
  const rating = typeof value === 'number' ? value : 0;
  return (
    <div className="rating">
      <div className="rating__face" key={rating} aria-hidden="true">
        {rating ? FACES[rating - 1] : '🤔'}
      </div>
      <div className="rating__stars" role="radiogroup" aria-label={step.question}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            role="radio"
            aria-checked={rating === n}
            aria-label={t(n === 1 ? 'play.ratingOne' : 'play.ratingMany', { number: n, label: step.scale[n - 1] })}
            className={`rating__star${n <= rating ? ' is-on' : ''}`}
            style={{ '--i': n - 1 } as CSSProperties}
            onClick={() => {
              buzz(n === 5 ? [10, 40, 20] : 10);
              onChange(n);
            }}
          >
            {/* key forces the pop animation to replay whenever the rating changes */}
            <span className="rating__pop" key={`${n}-${n <= rating ? rating : 'off'}`}>
              <StarIcon size={54} filled={n <= rating} />
            </span>
          </button>
        ))}
      </div>
      <div className={`rating__label${rating ? ' is-set' : ''}`} key={`label-${rating}`}>
        {rating ? step.scale[rating - 1] : t('play.tapStar')}
      </div>
    </div>
  );
}

/* ---------- Note ---------- */

function NoteStepView({ step, value, onChange }: StepProps<NoteStep>) {
  const { language, n } = useLanguage();
  const text = typeof value === 'string' ? value : '';
  const addSuggestion = (s: string) => {
    const next = text.trim() ? `${text.trim()}. ${s}` : s;
    onChange(next.slice(0, step.maxLength));
  };
  return (
    <div className="note">
      <div className="note__pad">
        <span className="note__pin" aria-hidden="true" />
        <textarea
          className="note__input"
          value={text}
          maxLength={step.maxLength}
          rows={4}
          placeholder={step.placeholder}
          dir={text ? 'auto' : language === 'fa' ? 'rtl' : 'ltr'}
          aria-label={step.question}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="note__count">
          <bdi dir="ltr">{n(text.length)}/{n(step.maxLength)}</bdi>
        </span>
      </div>
      {step.suggestions && step.suggestions.length > 0 && (
        <div className="note__chips">
          {step.suggestions.map((s) => (
            <button key={s} className="note__chip" onClick={() => addSuggestion(s)}>
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Renders any mission step from its definition. New step types plug in here. */
export function MissionStep({ step, value, onChange }: StepProps<Step>) {
  switch (step.type) {
    case 'choice':
      return <ChoiceStepView step={step} value={value} onChange={onChange} />;
    case 'rating':
      return <RatingStepView step={step} value={value} onChange={onChange} />;
    case 'note':
      return <NoteStepView step={step} value={value} onChange={onChange} />;
  }
}
