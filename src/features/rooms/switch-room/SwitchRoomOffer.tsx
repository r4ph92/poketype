import { getTranslations } from 'next-intl/server';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PageMain } from '@/components/pixel/PageMain';
import { PixelLink } from '@/components/pixel/PixelButton';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { SubmitButton } from '@/components/pixel/SubmitButton';
import { roomPath } from '@/domain/room-id';
import type { CurrentRoom } from '@/server/rooms/current-room';
import { switchRoom } from './switch-room';

type SwitchRoomOfferProps = { current: CurrentRoom; next: string | null };

// One offer for every way into a room (SALLE-06); "Rester" is a plain link back, so staying changes nothing on the server.
export async function SwitchRoomOffer({ current, next }: SwitchRoomOfferProps) {
  const t = await getTranslations('RoomSwitch');
  const warning = await leaveWarningFor(current);
  return (
    <PageMain>
      <PixelPanel titleId="switch-room-title" level={1} title={t('heading')}>
        <DialogueBox>
          <p>{t('message', { host: current.hostName })}</p>
          {warning !== null && <p className={current.isRacing ? 'font-bold text-error' : 'font-bold'}>{warning}</p>}
        </DialogueBox>
        <form action={switchRoom} className="flex flex-wrap gap-3">
          {next !== null && <input type="hidden" name="next" value={next} />}
          <SubmitButton label={t('leaveAndJoin')} />
          <PixelLink href={roomPath(current.roomId)}>{t('stay')}</PixelLink>
        </form>
      </PixelPanel>
    </PageMain>
  );
}

// The same warnings as the room's own leave button: a running race is abandoned first, then a host hands the role on (#76).
async function leaveWarningFor({ isRacing, isHost }: CurrentRoom): Promise<string | null> {
  if (isRacing) return (await getTranslations('RoomSwitch'))('raceWarning');
  return isHost ? (await getTranslations('Room'))('leaveHostMessage') : null;
}
