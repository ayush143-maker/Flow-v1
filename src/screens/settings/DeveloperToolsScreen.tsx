import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Bell, Database, Download, Fingerprint, MessageSquare, Trash2,
} from 'lucide-react';
import { useAppStore } from '@/services/store/AppStoreProvider';
import { useNav } from '@/navigation/NavigationProvider';
import {
  generateTestNotification,
  generateTestSms,
  getEngineInfo,
  getNotificationStats,
  runParserTests,
  syncSms,
  type EngineInfo,
  type NotificationStats,
  type ParserTestResult,
} from '@/services/native/flow-core';
import { Button, ScreenHeader } from '@/components/ui';
import { dateShort } from '@/utils/format';

export function DeveloperToolsScreen() {
  const { transactions, addTestTransactions, clearTestData, resetDemoData } = useAppStore();
  const nav = useNav();
  const [engine, setEngine] = useState<EngineInfo | null>(null);
  const [notif, setNotif] = useState<NotificationStats | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [parserResult, setParserResult] = useState<ParserTestResult | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    void getEngineInfo().then(setEngine).catch(() => setEngine(null));
    void getNotificationStats().then(setNotif).catch(() => setNotif(null));
  }, []);

  const refreshNotif = () => {
    void getNotificationStats().then(setNotif).catch(() => setNotif(null));
  };

  const stats = useMemo(() => {
    const test = transactions.filter((t) => t.isTestData).length;
    const bySource = transactions.reduce<Record<string, number>>((acc, t) => {
      acc[t.source] = (acc[t.source] ?? 0) + 1;
      return acc;
    }, {});
    const oldest = transactions[transactions.length - 1];
    const newest = transactions[0];
    return {
      total: transactions.length,
      test,
      bySource,
      range:
        oldest && newest
          ? `${dateShort(new Date(oldest.transactionDate))} → ${dateShort(new Date(newest.transactionDate))}`
          : '—',
    };
  }, [transactions]);

  const runOp = (label: string, op: () => Promise<string>) => {
    setBusy(true);
    setParserResult(null);
    void op()
      .then((msg) => setFeedback(`${label}: ${msg}`))
      .catch((err) =>
        setFeedback(`${label} failed: ${err instanceof Error ? err.message : String(err)}`),
      )
      .finally(() => setBusy(false));
  };

  return (
    <div className="pad dev">
      <ScreenHeader title="Developer tools" onBack={nav.pop} />

      <div className="dev-warning">
        <AlertTriangle size={16} />
        <span>
          Test data is clearly flagged and easy to clear — it never mixes silently with
          real transactions. Everything runs locally.
        </span>
      </div>

      <div className="card dev-card">
        <h4 className="dev-title">SMS engine (real parser)</h4>
        <Button
          block
          disabled={busy}
          onClick={() =>
            runOp('SMS sync', async () => {
              const r = await syncSms();
              if (!r.permissionGranted) {
                return 'SMS permission not granted — allow it from Profile → Permissions first.';
              }
              return `scanned ${r.scanned}, parsed ${r.parsed}, inserted ${r.inserted}, duplicates ${r.duplicates}`;
            })
          }
        >
          <MessageSquare size={15} /> Sync SMS now
        </Button>
        <Button
          block
          variant="secondary"
          disabled={busy}
          onClick={() =>
            runOp('Test SMS', async () => {
              const r = await generateTestSms();
              if (!engine?.native) return 'runs in the Android app (web preview here).';
              return r.inserted > 0
                ? `${r.inserted} transactions inserted via the real parser (flagged as test).`
                : 'nothing new — this day already has these test messages. Clear test data and retry.';
            })
          }
        >
          Generate test SMS (parser)
        </Button>
        <Button
          block
          variant="secondary"
          disabled={busy}
          onClick={() =>
            runOp('Parser suite', async () => {
              const r = await runParserTests();
              setParserResult(r);
              if (r.total === 0) return 'runs in the Android app (web preview here).';
              return r.failures.length === 0
                ? `all ${r.total} cases passed`
                : `${r.passed}/${r.total} passed`;
            })
          }
        >
          Run parser test suite
        </Button>
        {parserResult && parserResult.failures.length > 0 && (
          <ul className="dev-failures">
            {parserResult.failures.map((f, i) => (
              <li key={i}>
                <span className="dev-fail-msg">{f.message}</span>
                <span className="dev-fail-reason">{f.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card dev-card">
        <h4 className="dev-title">Notifications (real listener)</h4>
        {notif && (
          <div className="dev-stats">
            <div className="dev-stat">
              <span>Listener enabled</span>
              <strong>{notif.listenerEnabled ? 'Yes' : 'No'}</strong>
            </div>
            <div className="dev-stat">
              <span>Listener bound</span>
              <strong>{notif.listenerBound ? 'Yes' : 'No'}</strong>
            </div>
            <div className="dev-stat">
              <span>Processing enabled</span>
              <strong>{notif.processingEnabled ? 'Yes' : 'No'}</strong>
            </div>
            <div className="dev-stat">
              <span>Notification transactions</span>
              <strong>{notif.notificationTransactions}</strong>
            </div>
          </div>
        )}
        <Button
          block
          disabled={busy}
          onClick={() =>
            runOp('Test notifications', async () => {
              const r = await generateTestNotification();
              refreshNotif();
              if (!engine?.native) return 'runs in the Android app (web preview here).';
              if (r.inserted === 0 && r.duplicates === 0) {
                return 'nothing new — these test notifications already exist for today.';
              }
              return `${r.inserted} inserted · ${r.duplicates} duplicates (same payments already captured from the other source — dedup working)`;
            })
          }
        >
          <Bell size={15} /> Generate test notifications
        </Button>
        <p className="set-note">
          Enable notification access from Profile → Permissions. Real bank/payment
          notifications are then parsed on-device, and the same payment arriving via
          SMS and a notification is stored exactly once.
        </p>
      </div>

      <div className="card dev-card">
        <h4 className="dev-title">Test data</h4>
        <Button
          block
          onClick={() => {
            addTestTransactions();
            setFeedback('Added 50 mock test transactions (last 10 days).');
          }}
        >
          Generate 50 mock transactions
        </Button>
        <Button
          block
          variant="secondary"
          onClick={() => {
            clearTestData();
            setFeedback('Test data cleared.');
            refreshNotif();
          }}
          disabled={stats.test === 0}
        >
          <Trash2 size={15} /> Clear test data ({stats.test})
        </Button>
        <Button
          block
          variant="secondary"
          onClick={() => {
            if (!confirmReset) {
              setConfirmReset(true);
              return;
            }
            resetDemoData();
            setConfirmReset(false);
            setFeedback('Demo dataset regenerated — merchant rules were kept and re-applied.');
          }}
        >
          {confirmReset ? 'Tap again to confirm reset' : 'Reset demo data'}
        </Button>
        {feedback && <p className="dev-feedback">{feedback}</p>}
      </div>

      <div className="card dev-card">
        <h4 className="dev-title">Coming in the next batch</h4>
        <div className="dev-pending">
          <Download size={16} />
          <span>Export data (CSV / JSON) + local backup & restore — Batch 5.</span>
        </div>
        <div className="dev-pending">
          <Fingerprint size={16} />
          <span>Biometric unlock for App Lock — final hardening batch.</span>
        </div>
      </div>

      <div className="card dev-card">
        <h4 className="dev-title">Data snapshot</h4>
        <div className="dev-stats">
          <div className="dev-stat">
            <span>Total transactions</span>
            <strong>{stats.total}</strong>
          </div>
          {Object.entries(stats.bySource).map(([source, count]) => (
            <div className="dev-stat" key={source}>
              <span>via {source}</span>
              <strong>{count}</strong>
            </div>
          ))}
          <div className="dev-stat">
            <span>Date range</span>
            <strong>{stats.range}</strong>
          </div>
          <div className="dev-stat">
            <span>Native engine</span>
            <strong>
              {engine ? (engine.native ? `Connected · v${engine.version}` : 'Web preview') : '—'}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
