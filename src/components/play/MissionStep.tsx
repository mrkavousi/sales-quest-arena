import { useEffect, useState, type CSSProperties } from 'react';
import { checkEvidenceFile } from '../../api/image';
import type { AnswerValue, ChoiceStep, EvidenceStep, MissionStep as Step, NoteStep, RatingStep } from '../../game/types';
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

/* ---------- Evidence (image) ---------- */

/** The chosen file stays in the play screen; only its name is stored as the step "answer". */
export interface EvidenceControl {
  file: File | null;
  onFile: (file: File | null) => void;
}

function EvidenceStepView({ step, value, onChange, evidence }: StepProps<EvidenceStep> & { evidence?: EvidenceControl }) {
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const file = evidence?.file ?? null;
  useEffect(() => {
    if (!file) { setPreview(null); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (picked: File | undefined) => {
    if (!picked) return;
    const check = checkEvidenceFile(picked);
    if (check !== 'ok') { setError(t(check === 'tooLarge' ? 'server.evidence.tooLarge' : 'server.evidence.badType')); return; }
    setError(null);
    evidence?.onFile(picked);
    onChange(picked.name);
  };

  return (
    <div className="evidence">
      {preview && <img className="evidence__preview" src={preview} alt={t('server.evidence.preview')} />}
      {typeof value === 'string' && value && <p className="evidence__name"><bdi dir="ltr">{value}</bdi></p>}
      <label className="btn btn--yellow btn--block evidence__pick">
        {t(file ? 'server.evidence.replace' : 'server.evidence.choose')}
        <input className="evidence__input" type="file" accept="image/*" aria-label={step.question} onChange={(event) => { pick(event.target.files?.[0]); event.target.value = ''; }} />
      </label>
      {file && <button type="button" className="linkbtn linkbtn--danger" onClick={() => { evidence?.onFile(null); onChange(''); }}>{t('server.evidence.remove')}</button>}
      {step.required && !file && <p className="evidence__hint">{t('server.evidence.required')}</p>}
      {error && <p className="evidence__error" role="alert">{error}</p>}
    </div>
  );
}

/** Renders any mission step from its definition. New step types plug in here. */
export function MissionStep({ step, value, onChange, evidence }: StepProps<Step> & { evidence?: EvidenceControl }) {
  switch (step.type) {
    case 'choice':
      return <ChoiceStepView step={step} value={value} onChange={onChange} />;
    case 'rating':
      return <RatingStepView step={step} value={value} onChange={onChange} />;
    case 'note':
      return <NoteStepView step={step} value={value} onChange={onChange} />;
    case 'evidence':
      return <EvidenceStepView step={step} value={value} onChange={onChange} evidence={evidence} />;
  }
}
