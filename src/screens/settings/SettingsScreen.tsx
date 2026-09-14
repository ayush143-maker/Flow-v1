import { useMemo, useState, type ReactNode } from 'react';
import {
  Bell, ChevronRight, Database, Download, FlaskConical, Info, KeyRound, LayoutGrid,
  ListChecks, MessageSquare, Repeat, ShieldCheck, HardDrive,
} from 'lucide-react';
import logoUrl from '@/assets/brand/logo.svg';
import { useAppStore } from '@/services/store/AppStoreProvider';
import { useNav } from '@/navigation/NavigationProvider';
import { usePermissions } from '@/hooks/usePermissions';
import { Button, Sheet, Toggle } from '@/components/ui';
import { detectRecurring } from '@/services/analytics/recurring';
import { APP_NAME, APP_TAGLINE, APP_VERSION } from '@/app-info';

export function SettingsScreen() {
  const {
    profile, updateName, rules, transactions, categories, settings, setNotificationsEnabled,
  } = useAppStore();
  const nav = useNav();
  const perms = usePermissions();
  const [editOpen, setEditOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile?.name ?? '');

  const recurringCount = useMemo(() => detectRecurring(transactions).length, [transactions]);

  const initials = (profile?.name ?? 'F')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="pad set">
      <h1 className="screen-title">Settings</h1>

      <button type="button" className="card set-profile" onClick={() => {
        setNameDraft(profile?.name ?? '');
        setEditOpen(true);
      }}>
        <span className="home-avatar">{initials}</span>
        <span className="set-profile-body">
          <strong>{profile?.name ?? 'Your profile'}</strong>
          <span>Local profile · stored on this device</span>
        </span>
        <ChevronRight size={18} />
      </button>

      <h4 className="set-group-title">Permissions</h4>
      <div className="card">
        <div className="set-row">
          <MessageSquare size={19} />
          <div className="set-row-body">
            <strong>SMS access</strong>
            <span className="set-row-sub">
              Read transaction messages to detect spending
            </span>
          </div>
          <span className={`status-dot ${perms.smsGranted ? 'is-on' : ''}`} />
        </div>
        <div className="set-row set-row--action">
          <Button size="sm" variant="secondary" onClick={() => void perms.grantSms()}>
            {perms.smsGranted ? 'Re-check access' : 'Grant access'}
          </Button>
          {!perms.native && <span className="set-note">Web preview — simulated</span>}
        </div>

        <div className="set-row">
          <Bell size={19} />
          <div className="set-row-body">
            <strong>Notification access</strong>
            <span className="set-row-sub">Read supported bank/payment notifications</span>
          </div>
          <span className={`status-dot ${perms.notifEnabled ? 'is-on' : ''}`} />
        </div>
        <div className="set-row set-row--action">
          <Button
            size="sm"
            variant="secondary"
            disabled={!perms.native}
            onClick={() => void perms.openNotifSettings()}
          >
            Open Android settings
          </Button>
        </div>

        <div className="set-row">
          <Repeat size={19} />
          <div className="set-row-body">
            <strong>Process notification transactions</strong>
            <span className="set-row-sub">Works only when access is enabled above</span>
          </div>
          <Toggle
            checked={settings.notificationsEnabled}
            onChange={setNotificationsEnabled}
            label="Process notification transactions"
          />
        </div>
      </div>

      <h4 className="set-group-title">Manage</h4>
      <div className="card">
        <SetLink icon={<LayoutGrid size={19} />} label="Categories" value={String(categories.length)} onClick={() => nav.push({ name: 'categories' })} />
        <SetLink icon={<ListChecks size={19} />} label="Merchant rules" value={String(rules.length)} onClick={() => nav.push({ name: 'merchant-rules' })} />
        <SetLink icon={<Repeat size={19} />} label="Recurring payments" value={String(recurringCount)} onClick={() => nav.push({ name: 'recurring' })} />
      </div>

      <h4 className="set-group-title">Data</h4>
      <div className="card">
        <SetLink icon={<Download size={19} />} label="Export data" value="CSV · JSON" onClick={() => nav.push({ name: 'coming-soon', feature: 'Export data (CSV / JSON)', phase: 'Batch 5 — Insights & Export' })} />
        <SetLink icon={<HardDrive size={19} />} label="Backup & restore" value="Local only" onClick={() => nav.push({ name: 'coming-soon', feature: 'Backup & restore (local)', phase: 'Batch 5 — Insights & Export' })} />
      </div>

      <h4 className="set-group-title">Security</h4>
      <div className="card">
        <SetLink icon={<KeyRound size={19} />} label="App lock" value={settings.appLockEnabled ? 'On' : 'Off'} onClick={() => nav.push({ name: 'app-lock' })} />
        <SetLink icon={<ShieldCheck size={19} />} label="Privacy & security" onClick={() => setPrivacyOpen(true)} />
      </div>

      <h4 className="set-group-title">About</h4>
      <div className="card">
        <SetLink icon={<Info size={19} />} label={`About ${APP_NAME}`} value={`v${APP_VERSION}`} onClick={() => setAboutOpen(true)} />
        <SetLink icon={<FlaskConical size={19} />} label="Developer tools" onClick={() => nav.push({ name: 'developer' })} />
      </div>

      <p className="set-foot">
        <Database size={13} /> Your transaction data is stored locally on this device.
      </p>

      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Your name">
        <input
          className="input"
          value={nameDraft}
          maxLength={30}
          onChange={(e) => setNameDraft(e.target.value)}
        />
        <div className="sheet-actions">
          <Button
            block
            disabled={!nameDraft.trim()}
            onClick={() => {
              updateName(nameDraft);
              setEditOpen(false);
            }}
          >
            Save
          </Button>
        </div>
      </Sheet>

      <Sheet open={aboutOpen} onClose={() => setAboutOpen(false)} title={`About ${APP_NAME}`}>
        <div className="about">
          <img src={logoUrl} alt="" className="about-logo" />
          <strong>{APP_NAME}</strong>
          <span className="about-tagline">{APP_TAGLINE}</span>
          <div className="about-rows">
            <span>Version</span><strong>v{APP_VERSION} · Phase 2</strong>
            <span>Engine</span><strong>Native Kotlin · on-device</strong>
            <span>Data</span><strong>100% local</strong>
          </div>
          <p className="about-privacy">
            Your transaction data is stored locally on this device. Flow has no accounts,
            no cloud sync, no analytics and no ads.
          </p>
        </div>
      </Sheet>

      <Sheet open={privacyOpen} onClose={() => setPrivacyOpen(false)} title="Privacy & security">
        <ul className="privacy-list">
          <li>Transaction data is stored locally on this device (on-device SQLite).</li>
          <li>SMS and notification content is parsed on your phone and never uploaded.</li>
          <li>No analytics SDKs, no advertising SDKs, no accounts, no cloud sync.</li>
          <li>Location permission is never requested — Flow has no maps or tracking.</li>
          <li>Export is user-initiated and writes a local file only.</li>
        </ul>
      </Sheet>
    </div>
  );
}

function SetLink({
  icon,
  label,
  value,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="set-row" onClick={onClick}>
      <span className="set-row-icon">{icon}</span>
      <div className="set-row-body">
        <strong>{label}</strong>
      </div>
      {value ? <span className="set-row-value">{value}</span> : null}
      <ChevronRight size={17} />
    </button>
  );
}
