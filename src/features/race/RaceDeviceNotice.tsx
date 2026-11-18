import { useTranslations } from 'next-intl';
import { DialogueBox } from '@/components/pixel/DialogueBox';

// Always rendered; globals.css shows it, and hides the route and the passage, only on a narrow or touch-only screen, so no device check runs in JavaScript.
export function RaceDeviceNotice() {
  const t = useTranslations('Room');
  return (
    <div className="race-device-notice">
      <DialogueBox heading={<h2 className="font-pixel text-lg font-bold">{t('keyboardNeededHeading')}</h2>}>
        <p>{t('keyboardNeededMessage')}</p>
      </DialogueBox>
    </div>
  );
}
