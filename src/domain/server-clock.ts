// sentAt and receivedAt come from the monotonic local clock (performance.now), never the wall clock, so a wrong or changed system time has no effect.
export type ServerTimeSample = { serverNow: number; sentAt: number; receivedAt: number };

export class ServerClock {
  private constructor(
    private readonly samples: readonly ServerTimeSample[],
    private readonly sampleWindow: number,
  ) {}

  static empty(sampleWindow: number): ServerClock {
    return new ServerClock([], sampleWindow);
  }

  withSample(sample: ServerTimeSample): ServerClock {
    return new ServerClock([...this.samples, sample].slice(-this.sampleWindow), this.sampleWindow);
  }

  // The server stamped its time somewhere during the round trip; the midpoint of the quickest one bounds the error by half its length.
  serverNowAt(localNow: number): number | null {
    const quickest = this.quickestSample();
    if (!quickest) return null;
    const offset = quickest.serverNow - (quickest.sentAt + quickest.receivedAt) / 2;
    return localNow + offset;
  }

  private quickestSample(): ServerTimeSample | undefined {
    return this.samples.reduce<ServerTimeSample | undefined>(
      (quickest, sample) => (!quickest || roundTripMs(sample) < roundTripMs(quickest) ? sample : quickest),
      undefined,
    );
  }
}

function roundTripMs(sample: ServerTimeSample): number {
  return sample.receivedAt - sample.sentAt;
}
