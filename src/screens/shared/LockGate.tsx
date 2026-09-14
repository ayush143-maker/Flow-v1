import { useState } from 'react';
import logoUrl from '@/assets/brand/logo.svg';
import { PinPad } from './PinPad';
import { sha256Hex } from '@/utils/hash';
import { APP_NAME } from '@/app-info';

export function LockGate({ pinHash, onSuccess }: { pinHash: string; onSuccess: () => void }) {
  const [shakeKey, setShakeKey] = useState(0);
  const [error, setError] = useState(false);

  const handle = async (pin: string) => {
    if ((await sha256Hex(pin)) === pinHash) {
      onSuccess();
    } else {
      setError(true);
      setShakeKey((k) => k + 1);
    }
  };

  return (
    <div className="full lock">
      <img src={logoUrl} alt="" className="lock-logo" />
      <h2 className="lock-title">{APP_NAME} is locked</h2>
      <p className="lock-sub">Enter your PIN to continue</p>
      {error && <p className="field-error lock-error">Wrong PIN — try again</p>}
      <PinPad onComplete={(pin) => void handle(pin)} shakeKey={shakeKey} />
      <p className="lock-hint">Forgot your PIN? Reinstalling {APP_NAME} resets the lock.</p>
    </div>
  );
}
