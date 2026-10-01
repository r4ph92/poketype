import type { ReactNode, Ref } from 'react';
import { DialogueBox, type DialogueTone } from './DialogueBox';
import { PixelPanel } from './PixelPanel';

type NoticePanelProps = {
  titleId: string;
  title: string;
  message: string;
  action: ReactNode;
  tone?: DialogueTone;
  headingRef?: Ref<HTMLHeadingElement>;
};

// A whole-page message (not found, race started, server error): the guide explains, one action leads on.
export function NoticePanel({ titleId, title, message, action, tone = 'info', headingRef }: NoticePanelProps) {
  return (
    <PixelPanel titleId={titleId} level={1} title={title} headingRef={headingRef}>
      <DialogueBox tone={tone}>
        <p>{message}</p>
      </DialogueBox>
      {action}
    </PixelPanel>
  );
}
