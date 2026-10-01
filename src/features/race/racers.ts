import type { RacerProgress, RoomMemberView } from '@/domain/room-view';

export type Racer = RoomMemberView & { progress: RacerProgress; isFinished: boolean };

const milestonePercents = [75, 50, 25] as const;

const notStarted: RacerProgress = { position: 0, finishMs: null };

// The viewer's own row follows local typing at once; rivals follow the snapshot.
export function racersWithLocalViewer(members: readonly RoomMemberView[], viewerProgress: RacerProgress, passageLength: number): Racer[] {
  return members.map((member) => {
    const progress = member.isViewer ? viewerProgress : (member.progress ?? notStarted);
    return { ...member, progress, isFinished: progress.finishMs !== null || progress.position >= passageLength };
  });
}

export function reachedMilestone(percent: number): number | null {
  return milestonePercents.find((milestone) => percent >= milestone) ?? null;
}
