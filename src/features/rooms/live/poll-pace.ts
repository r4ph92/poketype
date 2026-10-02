import { isRaceUnderway, type RoomSnapshot } from '@/domain/room-view';

export type PaceTiming = {
  waitingPollIntervalMs: number;
  racePollIntervalMs: number;
  keepaliveWaitingPollIntervalMs: number;
  keepaliveRacePollIntervalMs: number;
};

// Push is trusted while it is live and has announced every change a poll found; otherwise polling alone keeps the room fresh.
export class PollPace {
  private isRacing = false;
  private isPushLive = false;
  private hasPushMissedChange = false;
  private pingedRevision: number;

  constructor(
    private readonly timing: PaceTiming,
    fromRevision: number,
  ) {
    this.pingedRevision = fromRevision;
  }

  setPushLive(isLive: boolean): void {
    this.isPushLive = isLive;
    this.hasPushMissedChange = false;
  }

  notePing(revision: number): void {
    this.pingedRevision = Math.max(this.pingedRevision, revision);
    this.hasPushMissedChange = false;
  }

  follow(snapshot: RoomSnapshot, isNewer: boolean): void {
    this.isRacing = isRaceUnderway(snapshot);
    if (isNewer && snapshot.revision > this.pingedRevision) this.hasPushMissedChange = true;
  }

  isBehindPing(revision: number): boolean {
    return revision < this.pingedRevision;
  }

  intervalMs(): number {
    const { waitingPollIntervalMs, racePollIntervalMs, keepaliveWaitingPollIntervalMs, keepaliveRacePollIntervalMs } = this.timing;
    const isPushTrusted = this.isPushLive && !this.hasPushMissedChange;
    if (this.isRacing) return isPushTrusted ? keepaliveRacePollIntervalMs : racePollIntervalMs;
    return isPushTrusted ? keepaliveWaitingPollIntervalMs : waitingPollIntervalMs;
  }
}
