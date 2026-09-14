import { Sparkles } from 'lucide-react';
import { useNav } from '@/navigation/NavigationProvider';
import { ScreenHeader } from '@/components/ui';

export function ComingSoonScreen({ feature, phase }: { feature: string; phase: string }) {
  const nav = useNav();
  return (
    <div className="pad">
      <ScreenHeader title={feature} onBack={nav.pop} />
      <div className="empty">
        <div className="empty-icon">
          <Sparkles size={24} />
        </div>
        <h4 className="empty-title">Designed, not faked</h4>
        <p className="empty-body">
          {feature} is planned for <strong>{phase}</strong>. Nothing here pretends to work
          before it actually does.
        </p>
      </div>
    </div>
  );
}
