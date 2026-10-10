import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const gateway = (import.meta.env.VITE_GATEWAY_URL || 'http://localhost:4000').replace(/\/$/, '');
function App() {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  async function check(signal) {
    setState(previous => ({ ...previous, loading: true, error: '' }));
    try {
      const response = await fetch(`${gateway}/api/health`, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`Gateway returned HTTP ${response.status}`);
      const data = await response.json();
      if (data.status !== 'ok' || typeof data.timestamp !== 'string') throw new Error('Unexpected health response');
      setState({ loading: false, data, error: '' });
    } catch (error) {
      if (signal?.aborted) return;
      setState({ loading: false, data: null, error: error.name === 'TimeoutError' ? 'The gateway took too long to respond.' : 'Cannot reach the gateway. Check that the backend is running.' });
    }
  }
  useEffect(() => { const controller = new AbortController(); check(controller.signal); return () => controller.abort(); }, []);
  const healthy = !state.loading && !!state.data;
  return <main>
    <header><div className="brand"><span className="logo">G</span> Gateway <span className="muted">/ System overview</span></div><span className="milestone">Milestone 01</span></header>
    <section className="intro"><span className="eyebrow">YOUR MICROSERVICES START HERE</span><h1>A clear view of your gateway.</h1><p>One entry point. A simple health check. Ready for the next step.</p></section>
    <section className="card" aria-label="Gateway health">
      <div className="card-top"><div><h2>API Gateway</h2><p>Connection & availability</p></div><span className={`badge ${healthy ? 'healthy' : state.error ? 'offline' : ''}`}>{state.loading ? 'Checking…' : healthy ? '● Healthy' : '● Unavailable'}</span></div>
      <div role="status" aria-live="polite"><h3>{state.loading ? 'Connecting to your gateway' : healthy ? 'Your gateway is responding' : 'Connection needs attention'}</h3><p>{state.error || (healthy ? 'The health endpoint is available and responding successfully.' : 'Fetching the latest health status…')}</p></div>
      <dl><div><dt>ENDPOINT</dt><dd>/api/health</dd></div><div><dt>LAST CHECKED</dt><dd>{state.data ? new Date(state.data.timestamp).toLocaleTimeString() : '—'}</dd></div><div><dt>UPTIME</dt><dd>{state.data ? `${state.data.uptimeSeconds}s` : '—'}</dd></div></dl>
      <div className="card-bottom"><span>Manual health checks · No background polling</span><button disabled={state.loading} onClick={() => check()}>{state.loading ? 'Checking…' : 'Refresh status ↻'}</button></div>
    </section><footer>Gateway foundation <span>Built for a simple, gradual start.</span></footer>
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
