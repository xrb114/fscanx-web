import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';
import { useAppStore } from '../store/useAppStore';

const parseTarget = (target: string, idx: number): string => {
  const raw = target.trim();
  if (!raw) return `127.0.0.${(idx % 200) + 1}`;
  if (raw.includes('/')) {
    const base = raw.split('/')[0].split('.');
    if (base.length >= 3) return `${base[0]}.${base[1]}.${base[2]}.${(idx % 240) + 1}`;
  }
  if (raw.includes(',')) return raw.split(',')[idx % raw.split(',').length].trim();
  return raw;
};

export function TerminalView() {
  const ref = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const isRunning = useAppStore((s) => s.isRunning);
  const target = useAppStore((s) => s.config.target);
  const appendLog = useAppStore((s) => s.appendLog);
  const logLines = useAppStore((s) => s.logLines);

  useEffect(() => {
    if (!ref.current) return;
    const t = new Terminal({ theme: { background: '#030303', foreground: '#00f7ff' }, fontSize: 13, cursorBlink: true });
    const fit = new FitAddon();
    const search = new SearchAddon();
    t.loadAddon(fit);
    t.loadAddon(search);
    t.open(ref.current);
    fit.fit();
    t.writeln('\x1b[35m[FScanX Web]\x1b[0m 等待任务启动...');
    terminalRef.current = t;
    const resize = () => fit.fit();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      t.dispose();
    };
  }, []);

  useEffect(() => {
    const t = terminalRef.current;
    if (!t || !logLines.length) return;
    t.writeln(logLines[logLines.length - 1]);
  }, [logLines]);

  useEffect(() => {
    if (!isRunning) return;
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      const host = parseTarget(target, i);
      appendLog(`\x1b[32m[${new Date().toLocaleTimeString()}]\x1b[0m scanning host ${host}`);
    }, 900);
    return () => clearInterval(timer);
  }, [isRunning, target, appendLog]);

  return <div className='glass term'><div ref={ref} style={{ height: '100%' }} /></div>;
}
