import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, ReferenceLine } from 'recharts';

export default function MiniSensorChart({ data = [], dataKey, stroke = '#F5A800', threshold = null }) {
  const [shifted, setShifted] = useState(false);

  useEffect(() => {
    setShifted(true);
    const t = setTimeout(() => setShifted(false), 40);
    return () => clearTimeout(t);
  }, [data.length]);

  return (
    <div className="h-full w-full overflow-hidden rounded bg-transparent">
      <div style={{ transform: shifted ? 'translateX(6px)' : 'translateX(0)', transition: 'transform 380ms cubic-bezier(.22,.9,.36,1)', width: '100%', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <XAxis hide dataKey="idx" />
            <YAxis hide domain={["dataMin", "dataMax"]} />
            {threshold != null && <ReferenceLine y={threshold} stroke="#F5A800" strokeDasharray="3 4" />}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={stroke}
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={true}
              animationDuration={380}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
