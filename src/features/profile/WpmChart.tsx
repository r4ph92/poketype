import { getFormatter, getTranslations } from 'next-intl/server';
import type { WpmPoint } from '@/domain/profile-stats';
import { plotPoints, plotY, polylinePoints, wpmAxisMax, wpmAxisTicks, type PlotArea } from '@/domain/wpm-chart';
import { formatWholeNumber } from '@/features/race/race-number-format';

const plotArea: PlotArea = { width: 640, height: 240, inset: 12 };
const dotSize = 8;

// Axis labels are HTML beside the SVG, so they keep their reading size when the chart shrinks on a phone.
export async function WpmChart({ progression }: { progression: readonly WpmPoint[] }) {
  const t = await getTranslations('Profile');
  const values = progression.map((point) => point.wpm);
  const axisMax = wpmAxisMax(values);
  return (
    <figure className="wpm-chart">
      <p className="wpm-chart-unit" aria-hidden="true">{t('wpmAxis')}</p>
      <WpmAxisLabels axisMax={axisMax} />
      <WpmPlot values={values} axisMax={axisMax} />
      <WpmDateAxis progression={progression} />
    </figure>
  );
}

async function WpmPlot({ values, axisMax }: { values: readonly number[]; axisMax: number }) {
  const t = await getTranslations('Profile');
  const format = await getFormatter();
  const points = plotPoints(values, plotArea);
  const summary = t('chartSummary', { first: formatWholeNumber(format, values[0]!), last: formatWholeNumber(format, values.at(-1)!), best: formatWholeNumber(format, Math.max(...values)) });
  return (
    <svg viewBox={`0 0 ${plotArea.width} ${plotArea.height}`} role="img" aria-labelledby="wpm-chart-title wpm-chart-summary" shapeRendering="crispEdges" className="wpm-chart-plot">
      <title id="wpm-chart-title">{t('chartLabel')}</title>
      <desc id="wpm-chart-summary">{summary}</desc>
      {wpmAxisTicks(axisMax).map((tick) => <line key={tick} className="wpm-chart-grid" x1={0} x2={plotArea.width} y1={plotY(tick, axisMax, plotArea)} y2={plotY(tick, axisMax, plotArea)} />)}
      <polyline className="wpm-chart-line" points={polylinePoints(points)} />
      {points.map((point, index) => <rect key={index} className="wpm-chart-dot" x={point.x - dotSize / 2} y={point.y - dotSize / 2} width={dotSize} height={dotSize} />)}
    </svg>
  );
}

async function WpmAxisLabels({ axisMax }: { axisMax: number }) {
  const format = await getFormatter();
  return (
    <div className="wpm-chart-ticks" aria-hidden="true">
      {wpmAxisTicks(axisMax).map((tick) => <span key={tick} style={{ top: `${(plotY(tick, axisMax, plotArea) / plotArea.height) * 100}%` }}>{formatWholeNumber(format, tick)}</span>)}
    </div>
  );
}

async function WpmDateAxis({ progression }: { progression: readonly WpmPoint[] }) {
  const t = await getTranslations('Profile');
  const format = await getFormatter();
  const shortDate = (point: WpmPoint) => format.dateTime(point.endedAt, { dateStyle: 'medium' });
  return (
    <figcaption className="wpm-chart-dates">
      <span className="wpm-chart-ends" aria-hidden="true"><span>{shortDate(progression[0]!)}</span><span>{shortDate(progression.at(-1)!)}</span></span>
      <span>{t('raceAxis')}</span>
    </figcaption>
  );
}
