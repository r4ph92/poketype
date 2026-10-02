import { describe, expect, it } from 'vitest';
import { shouldRefreshOnAnnouncement } from '@/components/cross-tab-rule';

function settle(tabValues: string[], saved: string): number {
  const values = [...tabValues];
  let refreshes = 0;
  let announcements = values.map((value, sender) => ({ sender, value }));
  while (announcements.length > 0 && refreshes < 100) {
    const heard = announcements;
    announcements = [];
    for (const { sender, value } of heard) {
      values.forEach((own, listener) => {
        if (listener === sender || !shouldRefreshOnAnnouncement(own, value)) return;
        refreshes += 1;
        values[listener] = saved;
        announcements.push({ sender: listener, value: saved });
      });
    }
  }
  return refreshes;
}

describe('cross-tab announcement rule', () => {
  it('refreshes a tab that hears a different value', () => {
    expect(shouldRefreshOnAnnouncement('fr', 'en')).toBe(true);
  });

  it('never refreshes a tab that hears its own value', () => {
    expect(shouldRefreshOnAnnouncement('fr', 'fr')).toBe(false);
  });

  it('lets a stuck tab catch up with the saved value and then stops', () => {
    const refreshes = settle(['en', 'fr', 'en'], 'fr');
    expect(refreshes).toBeGreaterThan(0);
    expect(refreshes).toBeLessThan(100);
  });

  it('never refreshes when every tab already agrees', () => {
    expect(settle(['fr', 'fr', 'fr'], 'fr')).toBe(0);
  });
});
