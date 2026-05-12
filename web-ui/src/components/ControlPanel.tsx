import { useAppStore } from '../store/useAppStore';

const modules = ['主机发现', '端口扫描', '服务识别', 'Web 指纹', '漏洞检测', '弱口令爆破'];

export function ControlPanel() {
  const { config, setConfig, startTask, stopTask, isRunning, error } = useAppStore();

  return (
    <div className='glass panel'>
      <h3>任务控制台</h3>
      {!!error && <div style={{ color: '#ff5c8a', marginBottom: 8 }}>{error}</div>}
      <input className='input' placeholder='IP/CIDR/域名，如 192.168.1.0/24' value={config.target} onChange={(e) => setConfig({ target: e.target.value })} />
      <input className='input' placeholder='端口，如 80,443,22,3389' value={config.ports} onChange={(e) => setConfig({ ports: e.target.value })} />
      <div className='row'>
        <input className='input' placeholder='用户名字典' value={config.userDict} onChange={(e) => setConfig({ userDict: e.target.value })} />
        <input className='input' placeholder='密码字典' value={config.passDict} onChange={(e) => setConfig({ passDict: e.target.value })} />
      </div>
      <select className='select' multiple value={config.modules} onChange={(e) => setConfig({ modules: Array.from(e.target.selectedOptions).map((o) => o.value) })}>
        {modules.map((m) => <option key={m}>{m}</option>)}
      </select>
      <label>线程 {config.threads}<input type='range' min='10' max='2000' value={config.threads} onChange={(e) => setConfig({ threads: +e.target.value })} /></label>
      <div className='row'>
        <input className='input' placeholder='超时(s)' value={config.timeout} onChange={(e) => setConfig({ timeout: +e.target.value || 1 })} />
        <input className='input' placeholder='代理 socks5://127.0.0.1:1080' value={config.proxy} onChange={(e) => setConfig({ proxy: e.target.value })} />
      </div>
      <div className='row'>
        <button className='btn' disabled={isRunning} onClick={() => void startTask().catch((e) => useAppStore.setState({ error: `启动失败: ${String(e)}` }))}>{isRunning ? '扫描中...' : '开始扫描'}</button>
        <button className='input' disabled={!isRunning} onClick={() => void stopTask().catch((e) => useAppStore.setState({ error: `停止失败: ${String(e)}` }))}>停止</button>
      </div>
    </div>
  );
}
