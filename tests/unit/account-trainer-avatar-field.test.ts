import { describe, expect, it } from 'vitest';
import { accountTrainerAvatarField, defaultTrainerAvatar } from '@/assets/trainers';

describe('the trainer an avatar spot shows', () => {
  it('gives an account its pick', () => {
    expect(accountTrainerAvatarField(true, 'leaf')).toEqual({ trainerAvatar: 'leaf' });
  });

  it('gives an account without a confirmed pick the default trainer', () => {
    expect(accountTrainerAvatarField(true, null)).toEqual({ trainerAvatar: defaultTrainerAvatar });
    expect(accountTrainerAvatarField(true, 'mewtwo')).toEqual({ trainerAvatar: defaultTrainerAvatar });
  });

  it('gives a guest none, so the pixel avatar stays', () => {
    expect(accountTrainerAvatarField(false, null)).toEqual({});
  });
});
