import { Home, PieChart, Receipt, Settings, type LucideIcon } from 'lucide-react';
import type { TabName } from '@/navigation/types';

const ITEMS: { name: TabName; label: string; Icon: LucideIcon }[] = [
  { name: 'home', label: 'Home', Icon: Home },
  { name: 'transactions', label: 'Transactions', Icon: Receipt },
  { name: 'insights', label: 'Insights', Icon: PieChart },
  { name: 'settings', label: 'Settings', Icon: Settings },
];

export function BottomNav({ tab, onSelect }: { tab: TabName; onSelect: (t: TabName) => void }) {
  return (
    <nav className="bottomnav" aria-label="Main navigation">
      {ITEMS.map(({ name, label, Icon }) => (
        <button
          key={name}
          type="button"
          className={`nav-item ${tab === name ? 'is-active' : ''}`}
          onClick={() => onSelect(name)}
          aria-current={tab === name ? 'page' : undefined}
        >
          <Icon size={21} strokeWidth={tab === name ? 2.2 : 1.8} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
