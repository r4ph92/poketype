import { heatLevelOf, type KeyboardHeat } from '@/domain/keyboard-heat';
import type { KeyboardKey, KeyboardLayout } from '@/domain/keyboard-layouts';

type KeyboardHeatMapProps = { layout: KeyboardLayout; heat: KeyboardHeat; label: string };

// The list beside it says the same in text, so the drawing is one labelled image.
export function KeyboardHeatMap({ layout, heat, label }: KeyboardHeatMapProps) {
  return (
    <div className="heat-keyboard" role="img" aria-label={label}>
      {layout.rows.map((row, rowIndex) => (
        <div key={rowIndex} className="heat-row">
          {row.map((key) => <HeatKey key={key.id} keyboardKey={key} count={heat.keyCounts.get(key.id) ?? 0} maxCount={heat.maxCount} />)}
        </div>
      ))}
    </div>
  );
}

type HeatKeyProps = { keyboardKey: KeyboardKey; count: number; maxCount: number };

function HeatKey({ keyboardKey: { label, width, characters }, count, maxCount }: HeatKeyProps) {
  const isTypeable = characters.length > 0;
  return (
    <span className="heat-key" data-heat={heatLevelOf(count, maxCount)} data-filler={!isTypeable || undefined} style={{ flexGrow: width }}>
      {label}
      {count > 0 && <b>{count}</b>}
    </span>
  );
}
