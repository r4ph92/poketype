'use client';

import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PixelButton } from '@/components/pixel/PixelButton';
import { RoomAddressField } from './RoomAddressField';
import { useCopyRoomAddress } from './use-copy-room-address';

type CopyRoomLinkProps = { copyLabel: string; copiedMessage: string; copyFailedMessage: string; linkLabel: string };

export function CopyRoomLink({ copyLabel, copiedMessage, copyFailedMessage, linkLabel }: CopyRoomLinkProps) {
  const { outcome, roomUrl, copyCount, copyLink } = useCopyRoomAddress();
  return (
    <div className="grid gap-3">
      <PixelButton onClick={copyLink}>{copyLabel}</PixelButton>
      <div role="status">
        {outcome === 'copied' && (
          <DialogueBox tone="success">
            <p>{copiedMessage}</p>
          </DialogueBox>
        )}
        {outcome === 'failed' && (
          <DialogueBox>
            <p>{copyFailedMessage}</p>
          </DialogueBox>
        )}
      </div>
      {outcome === 'failed' && <RoomAddressField key={copyCount} roomUrl={roomUrl} label={linkLabel} />}
    </div>
  );
}
