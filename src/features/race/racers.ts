import { memberText } from '@/domain/catch-up-bonus-view';
import { passageLength } from '@/domain/passage';
import type { RacerProgress, RaceView, RoomMemberView } from '@/domain/room-view';

// textLength is the racer's own text: the passage, shorter by the words their catch-up bonuses removed (BONUS-04).
export type Racer = RoomMemberView & { progress: RacerProgress; textLength: number; isFinished: boolean; isAbandoned: boolean; isInactive: boolean };

export type RacerTexts = Pick<RaceView, 'passage' | 'bonuses'>;

const milestonePercents = [75, 50, 25] as const;

export const notStartedProgress: RacerProgress = { position: 0, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0, disconnected: false, abandonedOffline: false, lastSeenMs: 0 };

export function memberTextLength({ passage, bonuses }: RacerTexts, memberKey: string): number {
  return passageLength(memberText(passage, bonuses, memberKey));
}

// The viewer's own row follows local typing at once; rivals follow the snapshot.
export function racersWithLocalViewer(members: readonly RoomMemberView[], viewerProgress: RacerProgress, texts: RacerTexts): Racer[] {
  return members.map((member) => {
    const progress = member.isViewer ? viewerProgress : (member.progress ?? notStartedProgress);
    const textLength = memberTextLength(texts, member.memberKey);
    const isOut = progress.abandoned || progress.inactive;
    const isFinished = !isOut && (progress.finishMs !== null || progress.position >= textLength);
    return { ...member, progress, textLength, isFinished, isAbandoned: progress.abandoned, isInactive: progress.inactive };
  });
}

export function reachedMilestone(percent: number): number | null {
  return milestonePercents.find((milestone) => percent >= milestone) ?? null;
}
