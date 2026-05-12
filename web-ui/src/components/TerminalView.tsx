import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';
import { useAppStore } from '../store/useAppStore';
import { scanApi } from '../api/client';

export function TerminalView() {
  const ref = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const logLines = useAppStore((s) => s.logLines);
  const appendLog = useAppStore((s) => s.appendLog);
  const activeTaskId = useAppStore((s) => s.activeTaskId);

  useEffect(() => {
    if (!ref.current) return;
    const t = new Terminal({ theme: { background: '#030303', foreground: '#00f7ff' }, fontSize: 13, cursorBlink: true, convertEol: true });
    const fit = new FitAddon();
    const search = new SearchAddon();
    t.loadAddon(fit);
    t.loadAddon(search);
    t.open(ref.current);
    fit.fit();
    t.writeln('\x1b[35m[FScanX Web]\x1b[0m 等待后端任务日志...');
    terminalRef.current = t;

    const resize = () => fit.fit();
    window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); t.dispose(); };
  }, []);

  useEffect(() => {
    const t = terminalRef.current;
    if (!t || !logLines.length) return;
    t.writeln(logLines[logLines.length - 1]);
  }, [logLines]);

  useEffect(() => {
    if (!activeTaskId) return;
    void scanApi.logs(activeTaskId)
      .then((resp) => {
        const logs = Array.isArray(resp.data) ? resp.data : resp.data?.logs ?? [];
        logs.slice(-200).forEach((line: string) => appendLog(line));
      })
      .catch(() => appendLog('\x1b[31m[error]\x1b[0m 无法拉取历史日志，请确认 /api/scan/logs/:id')); 
  }, [activeTaskId, appendLog]);

  return <div className='glass term'><div ref={ref} style={{ height: '100%' }} /></div>;
}
