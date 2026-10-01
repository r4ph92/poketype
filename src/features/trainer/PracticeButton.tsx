'use client';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PixelButton } from '@/components/pixel/PixelButton';

export function PracticeButton() {
  const t = useTranslations('Trainer');
  const dialog = useRef<HTMLDialogElement>(null);
  const [answer, setAnswer] = useState('');
  const passage = t('practicePassage');
  let correct = 0;
  while (correct < answer.length && answer[correct] === passage[correct]) correct++;
  return <>
    <PixelButton variant="secondary" onClick={() => dialog.current?.showModal()}>{t('practice')}</PixelButton>
    <dialog ref={dialog} aria-labelledby="practice-title" className="practice-dialog pixel-frame text-ink">
      <form method="dialog" className="flex justify-between gap-4"><h2 id="practice-title" className="font-pixel text-xl font-bold">{t('practice')}</h2><PixelButton type="submit" variant="secondary">{t('close')}</PixelButton></form>
      <p className="text-sm text-muted">{t('practiceHint')}</p>
      <p className="text-passage">{passage}</p>
      <label className="grid gap-2"><span>{t('practiceInput')}</span><input value={answer} onChange={(event) => setAnswer(event.target.value)} spellCheck={false} autoComplete="off" className="min-h-12 border-2 border-frame bg-cream-deep p-3" /></label>
      <p role="status">{t(correct === passage.length ? 'practiceDone' : 'practiceProgress', { count: correct, total: passage.length })}</p>
      <PixelButton variant="secondary" onClick={() => setAnswer('')}>{t('restart')}</PixelButton>
    </dialog>
  </>;
}
