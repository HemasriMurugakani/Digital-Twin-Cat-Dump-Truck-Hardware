import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, ReferenceLine } from 'recharts';

export default function MiniSensorChart({ data = [], dataKey, stroke = '#F5A800', threshold = null }) {
  const [shifted, setShifted] = useState(false);

  useEffect(() => {
    // trigger slide-in whenever data length increases
    setShifted(true);
    const t = setTimeout(() => setShifted(false), 40);
    return () => clearTimeout(t);
  }, [data.length]);

  return (
    <div className="h-16 w-full overflow-hidden rounded-md bg-transparent">
      <div style={{ transform: shifted ? 'translateX(8px)' : 'translateX(0)', transition: 'transform 420ms cubic-bezier(.22,.9,.36,1)' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <XAxis hide dataKey="idx" />
            <YAxis hide domain={["dataMin", "dataMax"]} />
            {threshold != null && <ReferenceLine y={threshold} stroke="#F5A800" strokeDasharray="3 4" />}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={stroke}
              dot={false}
              strokeWidth={2}
              isAnimationActive={true}
              animationDuration={420}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
