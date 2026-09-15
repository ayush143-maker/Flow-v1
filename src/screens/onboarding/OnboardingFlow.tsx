import { useEffect, useState } from 'react';
import { ArrowLeft, BellRing, Lock, MessageSquare, ShieldCheck } from 'lucide-react';
import logoUrl from '@/assets/brand/logo.svg';
import { useAppStore } from '@/services/store/AppStoreProvider';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui';
import { PrimaryButton } from '@/components/PrimaryButton';
import { APP_NAME } from '@/app-info';

type Step = 'welcome' | 'name' | 'permissions';

/** Abstract fintech visual — soft geometry, no stock imagery. */
function WelcomeVisual() {
  return (
    <svg viewBox="0 0 320 190" role="img" aria-label="Flow visual">
      <circle cx="104" cy="98" r="64" fill="#DDD7F2" />
      <circle cx="168" cy="118" r="58" fill="#C8E5DE" />
      <circle cx="216" cy="76" r="44" fill="#D8E6F2" />
      <path
        d="M46 150 A96 96 0 0 0 268 138"
        fill="none"
        stroke="#69B9AD"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="150" cy="104" r="9" fill="#111111" />
      <g>
        <rect x="196" y="128" width="94" height="34" rx="12" fill="#FFFFFF" />
        <circle cx="214" cy="145" r="6" fill="#DE9678" />
        <rect x="228" y="139" width="34" height="4" rx="2" fill="#B9B4AA" />
        <rect x="228" y="148" width="22" height="4" rx="2" fill="#D6D2C8" />
        <text x="272" y="150" textAnchor="end" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="700" fill="#111111">−₹420</text>
      </g>
      <circle cx="62" cy="52" r="5" fill="#CFC5EA" />
      <circle cx="258" cy="40" r="4" fill="#69B9AD" opacity="0.7" />
    </svg>
  );
}

export function OnboardingFlow() {
  const { profile, saveProfile, finishOnboarding } = useAppStore();
  const perms = usePermissions();
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState(profile?.name ?? '');

  useEffect(() => {
    if (step !== 'welcome') return;
    // Keep the welcome calm — no forced timer, the CTA moves things along.
  }, [step]);

  if (step === 'welcome') {
    return (
      <div className="full onboard welcome">
        <img src={logoUrl} alt={`${APP_NAME} logo`} className="welcome-logo" />
        <div className="welcome-mid">
          <div>
            <h1 className="welcome-headline">
              Know where
              <br />
              your money goes.
            </h1>
            <p className="welcome-sub">
              Flow quietly keeps track of your spending, so your money always makes sense.
            </p>
          </div>
          <div className="welcome-visual">
            <WelcomeVisual />
          </div>
        </div>
        <div className="welcome-foot">
          <PrimaryButton onClick={() => setStep('name')}>Get started</PrimaryButton>
          <p className="welcome-privacy">
            <Lock size={12} /> Your transactions stay private on your device.
          </p>
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
          <PrimaryButton
            disabled={!nameReady}
            onClick={() => {
              saveProfile(name);
              setStep('permissions');
            }}
          >
            Continue
          </PrimaryButton>
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
          Flow detects transactions from messages already on your phone. Everything is
          parsed on-device — nothing ever leaves it.
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
          {!perms.native && <span className="perm-note">Web preview — simulated permission.</span>}
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

        <PrimaryButton onClick={finishOnboarding}>Start using {APP_NAME}</PrimaryButton>
        <p className="ob-skip">You can change these anytime in Profile.</p>
      </div>
    </div>
  );
}
