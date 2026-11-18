import { isRaceUnderway, isStillRacing, isViewerHost, type RoomSnapshot } from '@/domain/room-view';

// race: leaving abandons the race the viewer is still running, which matters more to a racing host; host: leaving passes the role on (#76).
export type LeaveConfirmation = 'host' | 'race';

export function leaveConfirmationFor(snapshot: RoomSnapshot): LeaveConfirmation | null {
  if (isViewerStillRacing(snapshot)) return 'race';
  return isViewerHost(snapshot) ? 'host' : null;
}

function isViewerStillRacing(snapshot: RoomSnapshot): boolean {
  if (!isRaceUnderway(snapshot)) return false;
  const progress = snapshot.members.find((member) => member.isViewer)?.progress;
  return progress !== null && progress !== undefined && isStillRacing(progress);
}
