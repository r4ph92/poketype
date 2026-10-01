import { RoomPlayer } from '@/components/pixel/RoomPlayer';
import type { RoomMemberView } from '@/domain/room-view';

type RoomMemberListLabels = { hostBadge: string; you: string };

export function RoomMemberList({ members, labels }: { members: RoomMemberView[]; labels: RoomMemberListLabels }) {
  return (
    <ul className="grid gap-2">
      {members.map((member) => (
        <RoomPlayer key={member.memberKey} name={member.trainerName} isHost={member.isHost} isViewer={member.isViewer} labels={labels} />
      ))}
    </ul>
  );
}
