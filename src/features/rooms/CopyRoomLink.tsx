'use client';

import { RoomAddressField } from './RoomAddressField';
import { useCopyRoomAddress } from './use-copy-room-address';

type CopyRoomLinkProps = { copyLabel: string; copiedMessage: string; copyFailedMessage: string; linkLabel: string };

export function CopyRoomLink({ copyLabel, copiedMessage, copyFailedMessage, linkLabel }: CopyRoomLinkProps) {
  const { outcome, roomUrl, copyLink } = useCopyRoomAddress();
  return (
    <div className="mt-4 space-y-3">
      <button type="button" onClick={copyLink} className="min-h-11 border-4 border-ink bg-gold px-6 font-bold">
        {copyLabel}
      </button>
      <p role="status" className="font-bold">
        {outcome === 'copied' && copiedMessage}
        {outcome === 'failed' && copyFailedMessage}
      </p>
      {outcome === 'failed' && <RoomAddressField key={roomUrl} roomUrl={roomUrl} label={linkLabel} />}
    </div>
  );
}
