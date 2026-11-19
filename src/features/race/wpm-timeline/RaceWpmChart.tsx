'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { plotX, plotY, polylinePoints, timeAxisMaxMs, wpmAxisMax, wpmAxisTicks, type PlotArea } from '@/domain/wpm-chart';
import { formatWholeNumber } from '../race-number-format';
import { inDrawingOrder, type LineStyle, type WpmLine } from './wpm-lines';

const plotArea: PlotArea = { width: 640, height: 280, inset: 12 };

type Axes = { wpmMax: number; timeMaxMs: number };

const millisecondsPerSecond = 1000;

// Axis labels are HTML beside the SVG, as on the profile chart, so they keep their reading size when the chart shrinks on a phone.
export function RaceWpmChart({ lines }: { lines: readonly WpmLine[] }) {
  const t = useTranslations('Room');
  const points = lines.flatMap((line) => line.points);
  const axes: Axes = { wpmMax: wpmAxisMax(points.map((point) => point.wpm)), timeMaxMs: timeAxisMaxMs(points.map((point) => point.elapsedMs)) };
  return (
    <>
      <figure className="wpm-chart">
        <p className="wpm-chart-unit" aria-hidden="true">{t('wpmColumn')}</p>
        <WpmTicks wpmMax={axes.wpmMax} />
        <WpmPlot lines={lines} axes={axes} />
        <TimeAxis timeMaxMs={axes.timeMaxMs} />
      </figure>
      <WpmLegend lines={lines} />
    </>
  );
}

function WpmPlot({ lines, axes }: { lines: readonly WpmLine[]; axes: Axes }) {
  const t = useTranslations('Room');
  const format = useFormatter();
  const seconds = formatWholeNumber(format, axes.timeMaxMs / millisecondsPerSecond);
  return (
    <svg viewBox={`0 0 ${plotArea.width} ${plotArea.height}`} role="img" aria-labelledby="race-wpm-chart-title race-wpm-chart-summary" className="wpm-chart-plot">
      <title id="race-wpm-chart-title">{t('wpmTimelineLabel')}</title>
      <desc id="race-wpm-chart-summary">{t('wpmTimelineSummary', { count: lines.length, seconds })}</desc>
      {wpmAxisTicks(axes.wpmMax).map((tick) => <line key={tick} className="wpm-chart-grid" x1={0} x2={plotArea.width} y1={plotY(tick, axes.wpmMax, plotArea)} y2={plotY(tick, axes.wpmMax, plotArea)} />)}
      {inDrawingOrder(lines).map((line) => <WpmPolyline key={line.memberKey} line={line} axes={axes} />)}
    </svg>
  );
}

function WpmPolyline({ line, axes }: { line: WpmLine; axes: Axes }) {
  const points = line.points.map((point) => ({ x: plotX(point.elapsedMs, axes.timeMaxMs, plotArea), y: plotY(point.wpm, axes.wpmMax, plotArea) }));
  return <polyline className="race-wpm-line" data-viewer={line.isViewer} style={strokeOf(line.style)} points={polylinePoints(points)} />;
}

function WpmTicks({ wpmMax }: { wpmMax: number }) {
  const format = useFormatter();
  return (
    <div className="wpm-chart-ticks" aria-hidden="true">
      {wpmAxisTicks(wpmMax).map((tick) => <span key={tick} style={{ top: `${(plotY(tick, wpmMax, plotArea) / plotArea.height) * 100}%` }}>{formatWholeNumber(format, tick)}</span>)}
    </div>
  );
}

function TimeAxis({ timeMaxMs }: { timeMaxMs: number }) {
  const t = useTranslations('Room');
  const format = useFormatter();
  const ticks = [0, timeMaxMs / 2, timeMaxMs].map((elapsedMs) => formatWholeNumber(format, elapsedMs / millisecondsPerSecond));
  return (
    <figcaption className="wpm-chart-dates">
      <span className="wpm-chart-ends" aria-hidden="true">{ticks.map((tick, index) => <span key={index}>{t('wpmTimelineSeconds', { seconds: tick })}</span>)}</span>
      <span>{t('wpmTimelineTimeAxis')}</span>
    </figcaption>
  );
}

function WpmLegend({ lines }: { lines: readonly WpmLine[] }) {
  const t = useTranslations('Room');
  const bots = useTranslations('Bots');
  return (
    <ul className="race-wpm-legend" aria-label={t('wpmTimelineLegend')}>
      {lines.map((line) => (
        <li key={line.memberKey} data-viewer={line.isViewer}>
          <svg viewBox="0 0 36 12" width={36} height={12} aria-hidden="true"><line className="race-wpm-line" data-viewer={line.isViewer} style={strokeOf(line.style)} x1={0} x2={36} y1={6} y2={6} /></svg>
          <span>{line.trainerName}</span>
          {line.isViewer && <span className="race-wpm-you">{t('youMarker')}</span>}
          {line.isBot && <span className="bot-tag">{bots('botTag')}</span>}
        </li>
      ))}
    </ul>
  );
}

function strokeOf({ color, dash }: LineStyle) {
  return { stroke: `var(--color-${color})`, strokeDasharray: dash ?? undefined };
}
