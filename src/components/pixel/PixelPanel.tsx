import type { ReactNode, Ref } from 'react';

type PanelVariant = 'default' | 'well' | 'scene';

type PixelPanelProps = {
  titleId: string;
  title: ReactNode;
  level?: 1 | 2;
  meta?: ReactNode;
  variant?: PanelVariant;
  headingRef?: Ref<HTMLHeadingElement>;
  children?: ReactNode;
};

const variantClass: Record<PanelVariant, string> = {
  default: 'pixel-frame pixel-notch p-4 md:p-6',
  scene: 'pixel-frame pixel-notch p-3',
  well: 'pixel-frame-thin pixel-notch bg-cream-deep p-4',
};

const headingClass = {
  1: 'font-pixel text-xl font-bold wrap-anywhere',
  2: 'font-pixel text-lg font-bold uppercase tracking-[0.06em]',
} as const;

const titleRuleClass = 'border-b-2 border-slate pb-2';

// Without meta the heading carries the rule itself, so the panel's content stays a direct sibling of its heading.
export function PixelPanel({ titleId, title, level = 2, meta, variant = 'default', headingRef, children }: PixelPanelProps) {
  const Heading = level === 1 ? 'h1' : 'h2';
  const heading = (ruleClass: string) => (
    <Heading id={titleId} ref={headingRef} tabIndex={headingRef ? -1 : undefined} className={`min-w-0 ${headingClass[level]} ${ruleClass}`}>
      {title}
    </Heading>
  );
  return (
    <section aria-labelledby={titleId} className={`grid min-w-0 gap-4 ${variantClass[variant]}`}>
      {meta ? (
        <div className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 ${titleRuleClass}`}>
          {heading('')}
          <p className="text-sm text-muted">{meta}</p>
        </div>
      ) : (
        heading(titleRuleClass)
      )}
      {children}
    </section>
  );
}
