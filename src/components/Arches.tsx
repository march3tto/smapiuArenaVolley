import { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';

/** Archi dell'Arena di Verona, decorazione dei pannelli blu */
export function Arches({ width, height = 150, opacity = 0.42 }: { width: number; height?: number; opacity?: number }) {
  const paths = useMemo(() => {
    const w = 50;
    const n = Math.ceil(width / w) + 2;
    const out: { d: string; o: number }[] = [];
    for (let tier = 0; tier < 2; tier++) {
      const top = tier === 0 ? height - 68 : height - 136;
      const h = 66;
      const r = 17;
      for (let i = 0; i < n; i++) {
        const x = i * w + (tier ? w / 2 : 0) - (tier ? w : 0) + 8;
        out.push({ d: `M${x} ${top + h}V${top + r + 4}a${r} ${r} 0 0 1 ${r * 2} 0V${top + h}`, o: tier ? 0.6 : 1 });
      }
    }
    return out;
  }, [width, height]);
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, bottom: 0 }} pointerEvents="none">
      {paths.map((p, i) => (
        <Path key={i} d={p.d} stroke={`rgba(255,213,77,${opacity * p.o})`} strokeWidth={1.4} fill="none" />
      ))}
    </Svg>
  );
}
