import { isRaceUnderway, isViewerHost, type RoomSnapshot } from '@/domain/room-view';

// host: leaving closes the room for everyone; race: leaving abandons the race the viewer is still running.
export type LeaveConfirmation = 'host' | 'race';

export function leaveConfirmationFor(snapshot: RoomSnapshot): LeaveConfirmation | null {
  if (isViewerHost(snapshot)) return 'host';
  return isViewerStillRacing(snapshot) ? 'race' : null;
}

function isViewerStillRacing(snapshot: RoomSnapshot): boolean {
  if (!isRaceUnderway(snapshot)) return false;
  const progress = snapshot.members.find((member) => member.isViewer)?.progress;
  return progress !== null && progress !== undefined && progress.finishMs === null && !progress.abandoned;
}
