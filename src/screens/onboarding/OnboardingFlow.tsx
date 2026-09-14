import { useEffect, useState } from 'react';
import { ArrowLeft, BellRing, MessageSquare, ShieldCheck } from 'lucide-react';
import logoUrl from '@/assets/brand/logo.svg';
import { useAppStore } from '@/services/store/AppStoreProvider';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui';
import { APP_NAME, APP_TAGLINE } from '@/app-info';

type Step = 'splash' | 'name' | 'permissions';

export function OnboardingFlow() {
  const { profile, saveProfile, finishOnboarding } = useAppStore();
  const perms = usePermissions();
  const [step, setStep] = useState<Step>('splash');
  const [name, setName] = useState(profile?.name ?? '');

  useEffect(() => {
    const id = window.setTimeout(() => setStep('name'), 1500);
    return () => window.clearTimeout(id);
  }, []);

  if (step === 'splash') {
    return (
      <div className="full onboard onboard-splash">
        <div className="ob-splash-inner rise">
          <img src={logoUrl} alt={`${APP_NAME} logo`} className="ob-splash-logo" />
          <h1 className="ob-splash-name">{APP_NAME}</h1>
          <p className="ob-splash-tagline">{APP_TAGLINE}</p>
        </div>
      </div>
    );
  }

  const nameReady = name.trim().length > 0;

  if (step === 'name') {
    return (
      <div className="full onboard">
        <div className="ob-body rise">
          <img src={logoUrl} alt="" className="ob-logo" />
          <h2 className="ob-title">What&apos;s your name?</h2>
          <p className="ob-sub">Let&apos;s personalize your money overview.</p>
          <input
            className="input"
            value={name}
            maxLength={30}
            autoFocus
            placeholder="Your name"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && nameReady) {
                saveProfile(name);
                setStep('permissions');
              }
            }}
          />
          <Button
            size="lg"
            block
            disabled={!nameReady}
            onClick={() => {
              saveProfile(name);
              setStep('permissions');
            }}
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="full onboard">
      <div className="ob-body rise">
        <button
          type="button"
          className="ob-back"
          onClick={() => setStep('name')}
          aria-label="Back to name"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="ob-title">Two permissions, zero uploads</h2>
        <p className="ob-sub">
          Flow detects transactions from messages already on your phone. Everything
          is parsed on-device — nothing ever leaves it.
        </p>

        <div className="perm-card">
          <div className="perm-icon">
            <MessageSquare size={22} />
          </div>
          <div className="perm-body">
            <h4>SMS access</h4>
            <p>We use transaction messages to automatically detect your spending.</p>
          </div>
          <div className="perm-actions">
            <span className={`perm-status ${perms.smsGranted ? 'is-on' : ''}`}>
              {perms.smsGranted ? 'Granted' : 'Not granted'}
            </span>
            <Button size="sm" variant="secondary" onClick={() => void perms.grantSms()}>
              {perms.smsGranted ? 'Re-check' : 'Grant access'}
            </Button>
          </div>
          {!perms.native && (
            <span className="perm-note">Web preview — simulated permission.</span>
          )}
        </div>

        <div className="perm-card">
          <div className="perm-icon">
            <BellRing size={22} />
          </div>
          <div className="perm-body">
            <h4>Notification access</h4>
            <p>
              We can read supported bank/payment notifications to detect transactions.
              Enabled in Android Settings — Flow checks automatically when you return.
            </p>
          </div>
          <div className="perm-actions">
            <span className={`perm-status ${perms.notifEnabled ? 'is-on' : ''}`}>
              {perms.notifEnabled ? 'Enabled' : 'Not enabled'}
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={!perms.native}
              onClick={() => void perms.openNotifSettings()}
            >
              Open settings
            </Button>
          </div>
          {!perms.native && <span className="perm-note">Available on the Android app.</span>}
        </div>

        <div className="perm-privacy">
          <ShieldCheck size={16} />
          <span>Financial message data stays on your device. No location. Ever.</span>
        </div>

        <Button size="lg" block onClick={finishOnboarding}>
          Start using {APP_NAME}
        </Button>
        <p className="ob-skip">You can change these anytime in Settings.</p>
      </div>
    </div>
  );
}
