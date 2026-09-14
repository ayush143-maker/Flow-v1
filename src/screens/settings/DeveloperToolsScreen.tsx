import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, Database, MessageSquare, Trash2 } from 'lucide-react';
import { useAppStore } from '@/services/store/AppStoreProvider';
import { useNav } from '@/navigation/NavigationProvider';
import { getEngineInfo, type EngineInfo } from '@/services/native/flow-core';
import { Button, ScreenHeader } from '@/components/ui';
import { dateShort } from '@/utils/format';

export function DeveloperToolsScreen() {
  const { transactions, addTestTransactions, clearTestData, resetDemoData } = useAppStore();
  const nav = useNav();
  const [engine, setEngine] = useState<EngineInfo | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    void getEngineInfo()
      .then(setEngine)
      .catch(() => setEngine(null));
  }, []);

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
        <h4 className="dev-title">Test data</h4>
        <Button
          block
          onClick={() => {
            addTestTransactions();
            setFeedback('Added 50 test transactions (last 10 days).');
            setConfirmClear(false);
          }}
        >
          Generate 50 test transactions
        </Button>
        <Button
          block
          variant="secondary"
          onClick={() => {
            clearTestData();
            setFeedback('Test data cleared.');
            setConfirmClear(false);
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
        <h4 className="dev-title">Parser tools</h4>
        <div className="dev-pending">
          <MessageSquare size={16} />
          <span>Generate test SMS — ships with the native SMS engine (next batch).</span>
        </div>
        <div className="dev-pending">
          <Bell size={16} />
          <span>Generate test notification — ships with the notification listener (next batch).</span>
        </div>
        <div className="dev-pending">
          <Database size={16} />
          <span>Parser test suite — ships with the Kotlin parser + JUnit tests (next batch).</span>
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
