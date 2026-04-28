import { useEffect, useRef, useState } from 'react';
import { useSimulationStore } from '../../store/simulationStore';

const colorMap = {
  DUMP_START: '#ffffff',
  LOAD_CELL: '#F5A800',
  ACOUSTIC: '#3B82F6',
  CAMERA: '#22C55E',
  DECISION: '#EF4444',
  ACTION: '#F59E0B',
  VIBRATION: '#8B5CF6',
  STATUS: '#22C55E'
};

export default function AIDecisionLog() {
  const decisionLog = useSimulationStore((s) => s.decisionLog);
  const [displayed, setDisplayed] = useState([]);
  const idxRef = useRef(0);
  const scroller = useRef(null);
  const prevLen = useRef(decisionLog.length);

  useEffect(() => {
    // only restart the staged reveal when the log length increases
    if (decisionLog.length === prevLen.current) return;
    prevLen.current = decisionLog.length;
    setDisplayed([]);
    idxRef.current = 0;
    const id = setInterval(() => {
      if (idxRef.current >= decisionLog.length) {
        clearInterval(id);
        return;
      }
      // reveal newest-first
      const item = decisionLog[decisionLog.length - 1 - idxRef.current];
      setDisplayed((d) => [item, ...d]);
      idxRef.current += 1;
    }, 200);
    return () => clearInterval(id);
  }, [decisionLog.length]);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [displayed.length]);

  return (
    <div className="rounded-md border border-[var(--border)] bg-[#0A0A0A] p-3">
      <p className="heading text-sm text-[var(--yellow)]">AI Decision Log</p>
      <div ref={scroller} className="mt-2 max-h-44 overflow-y-auto pr-1 font-jetbrains-mono text-[11px] text-[#22c55e]">
        {displayed.length === 0 && <p className="text-xs text-[var(--text-muted)]">Awaiting events...</p>}
        {displayed.map((entry, i) => {
          const color = colorMap[entry.type] ?? '#9CA3AF';
          const time = new Date(entry.timestamp || Date.now()).toLocaleTimeString();
          return (
            <div key={`${entry.id}-${i}`} className="mb-1 whitespace-pre-wrap">
              <span style={{ color: '#9CA3AF' }}>[{time}] </span>
              <span style={{ color }}>{entry.type}</span>
              <span style={{ color: '#ffffff' }}> — </span>
              <span style={{ color: '#cbd5e1' }}>{entry.detail ?? entry.rationale ?? entry.action}</span>
            </div>
          );
        })}
        <div className="mt-2 h-4"> 
          <span className="blinking-cursor">█</span>
        </div>
      </div>
      <style>{`.font-jetbrains-mono{font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;} .blinking-cursor{animation:blink 1s steps(2,start) infinite; color:#22c55e} @keyframes blink{50%{opacity:0}}`}</style>
    </div>
  );
}
