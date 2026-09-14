import { useState } from 'react';
import { Fingerprint, KeyRound } from 'lucide-react';
import { useAppStore } from '@/services/store/AppStoreProvider';
import { useNav } from '@/navigation/NavigationProvider';
import { ScreenHeader } from '@/components/ui';
import { PinPad } from '@/screens/shared/PinPad';
import { sha256Hex } from '@/utils/hash';

type Mode = 'closed' | 'set' | 'confirm' | 'disable';

export function AppLockScreen() {
  const { settings, setAppLock } = useAppStore();
  const nav = useNav();
  const [mode, setMode] = useState<Mode>('closed');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const open = mode !== 'closed';

  const onComplete = async (pin: string) => {
    setError(null);
    if (mode === 'set') {
      setFirstPin(pin);
      setMode('confirm');
      return;
    }
    if (mode === 'confirm') {
      if (pin !== firstPin) {
        setError("PINs don't match — try again.");
        setShakeKey((k) => k + 1);
        setMode('set');
        return;
      }
      setAppLock(true, await sha256Hex(pin));
      setMode('closed');
      return;
    }
    // disable
    if ((await sha256Hex(pin)) === settings.pinHash) {
      setAppLock(false, null);
      setMode('closed');
    } else {
      setError('Wrong PIN — try again.');
      setShakeKey((k) => k + 1);
    }
  };

  const title =
    mode === 'set'
      ? 'Choose a 4-digit PIN'
      : mode === 'confirm'
        ? 'Confirm your PIN'
        : 'Enter your PIN to disable App Lock';

  return (
    <div className="pad">
      <ScreenHeader title="App lock" onBack={nav.pop} />

      <div className="card lock-card">
        <div className="lock-row">
          <KeyRound size={19} />
          <div className="set-row-body">
            <strong>App lock</strong>
            <span className="set-row-sub">
              {settings.appLockEnabled
                ? 'Enabled — Flow locks on launch and when backgrounded'
                : 'Disabled'}
            </span>
          </div>
        </div>
        <button
          type="button"
          className={`lock-toggle ${settings.appLockEnabled ? 'is-on' : ''}`}
          onClick={() => {
            setError(null);
            setMode(settings.appLockEnabled ? 'disable' : 'set');
          }}
        >
          {settings.appLockEnabled ? 'Disable App Lock' : 'Enable App Lock'}
        </button>
      </div>

      <div className="lock-note">
        <Fingerprint size={16} />
        <span>
          Biometric unlock (fingerprint / face) arrives with the native security phase —
          the PIN stays as its always-available fallback. The PIN never leaves this device.
        </span>
      </div>

      {open && (
        <div className="card lock-setup">
          <h4>{title}</h4>
          {error && <p className="field-error">{error}</p>}
          <PinPad onComplete={(pin) => void onComplete(pin)} shakeKey={shakeKey} />
        </div>
      )}
    </div>
  );
}
