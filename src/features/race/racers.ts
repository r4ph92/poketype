import type { RacerProgress, RoomMemberView } from '@/domain/room-view';

export type Racer = RoomMemberView & { progress: RacerProgress; isFinished: boolean; isAbandoned: boolean };

const milestonePercents = [75, 50, 25] as const;

const notStarted: RacerProgress = { position: 0, finishMs: null, abandoned: false };

// The viewer's own row follows local typing at once; rivals follow the snapshot.
export function racersWithLocalViewer(members: readonly RoomMemberView[], viewerProgress: RacerProgress, passageLength: number): Racer[] {
  return members.map((member) => {
    const progress = member.isViewer ? viewerProgress : (member.progress ?? notStarted);
    const isFinished = !progress.abandoned && (progress.finishMs !== null || progress.position >= passageLength);
    return { ...member, progress, isFinished, isAbandoned: progress.abandoned };
  });
}

export function reachedMilestone(percent: number): number | null {
  return milestonePercents.find((milestone) => percent >= milestone) ?? null;
}
