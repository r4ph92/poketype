import { getTranslations } from 'next-intl/server';
import type { RoomMemberView } from '@/server/rooms/room-snapshot';

export async function RoomMemberList({ members }: { members: RoomMemberView[] }) {
  const t = await getTranslations('Room');
  return (
    <section aria-labelledby="players-heading" className="mt-6 border-4 border-ink bg-white p-4">
      <h2 id="players-heading" className="font-bold">
        {t('playersHeading')}
      </h2>
      <ul className="mt-2 space-y-2">
        {members.map((member) => (
          <li key={member.memberKey} className="flex flex-wrap items-center gap-2">
            <span className="wrap-anywhere">{member.trainerName}</span>
            {member.isHost && <span className="border-2 border-ink bg-gold px-2 text-sm font-bold">{t('hostBadge')}</span>}
            {member.isViewer && <span className="border-2 border-ink bg-cream px-2 text-sm font-bold">{t('youMarker')}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
