import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import logoUrl from '@/assets/brand/logo.svg';
import { getEngineInfo, type EngineInfo } from '@/services/native/flow-core';
import { APP_NAME, APP_TAGLINE, APP_VERSION } from '@/app-info';
import './App.css';

type EngineState = 'checking' | 'ready' | 'unavailable';

const LIGHT_BG = '#FFFFFF';
const DARK_BG = '#0A0F1C';

/**
 * Phase 1 — foundation screen.
 * Proves the whole pipeline end to end: web bundle, Capacitor bridge,
 * native Kotlin plugin, brand assets, theming and safe areas.
 */
export default function App() {
  const [engine, setEngine] = useState<EngineInfo | null>(null);
  const [engineState, setEngineState] = useState<EngineState>('checking');

  useEffect(() => {
    let cancelled = false;
    getEngineInfo()
      .then((info) => {
        if (!cancelled) {
          setEngine(info);
          setEngineState('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setEngineState('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the Android status bar in sync with the active theme (light / dark).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const dark = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      void StatusBar.setStyle({ style: dark.matches ? Style.Dark : Style.Light });
      void StatusBar.setBackgroundColor({ color: dark.matches ? DARK_BG : LIGHT_BG });
    };
    apply();
    dark.addEventListener('change', apply);
    return () => dark.removeEventListener('change', apply);
  }, []);

  const isAndroid = Capacitor.getPlatform() === 'android';
  const nativeConnected = engineState === 'ready' && engine?.native === true;

  return (
    <div className="app-shell">
      <main className="foundation">
        <div className="brand-block rise rise-1">
          <img className="brand-mark" src={logoUrl} alt="Flow logo" />
          <h1 className="brand-name">{APP_NAME}</h1>
          <p className="tagline">{APP_TAGLINE}</p>
        </div>

        <section className="card status-card rise rise-2" aria-label="Engine status">
          <div className="status-row">
            <span>Platform</span>
            <strong>{isAndroid ? 'Android' : 'Web preview'}</strong>
          </div>
          <div className="status-row">
            <span>Native engine</span>
            <strong>
              {engineState === 'checking' && 'Connecting…'}
              {engineState === 'unavailable' && 'Unavailable'}
              {engineState === 'ready' &&
                engine &&
                (nativeConnected ? (
                  <>
                    <span className="badge-dot" />
                    Connected · v{engine.version}
                  </>
                ) : (
                  <>
                    <span className="badge-dot badge-dot--web" />
                    Not running natively
                  </>
                ))}
            </strong>
          </div>
          <div className="status-row">
            <span>Data</span>
            <strong>100% on-device</strong>
          </div>
          <div className="status-row">
            <span>Build</span>
            <strong>v{APP_VERSION} · Phase 1 · Foundation</strong>
          </div>
        </section>

        <p className="phase-note rise rise-3">
          Foundation is ready. The interface, on-device database and the SMS engine
          arrive in the next phases — nothing here requires a network.
        </p>
      </main>
    </div>
  );
}
