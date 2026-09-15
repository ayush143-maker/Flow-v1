import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '@/services/store/AppStoreProvider';
import { useNav } from '@/navigation/NavigationProvider';
import { getIcon, ICONS } from '@/components/icons';
import { Button, ScreenHeader, Sheet } from '@/components/ui';
import { CategoryCard } from '@/components/CategoryCard';
import { categoryBreakdown, inRange, monthToDate } from '@/services/analytics/derive';
import { categoryColor } from '@/theme/tokens';
import { formatMoney, monthLabel } from '@/utils/format';
import type { Category } from '@/types';

const COLOR_SWATCHES = [
  '#DE9678', '#D3A45E', '#8FC98A', '#69B9AD', '#7FB3E0',
  '#9B8FDC', '#B5A7E8', '#DE93B6', '#A6ACB8', '#A8ADA8',
];

const ICON_KEYS = Object.keys(ICONS);

export function CategoriesScreen() {
  const { transactions, categories, addCategory, updateCategory, deleteCategory } = useAppStore();
  const nav = useNav();
  const now = useMemo(() => new Date(), []);
  const { from } = monthToDate(now);

  const breakdown = useMemo(
    () => categoryBreakdown(inRange(transactions, from, now)),
    [transactions, from, now],
  );
  const total = breakdown.reduce((s, c) => s + c.amountMinor, 0);

  const [editing, setEditing] = useState<Category | null>(null);
  const [adding, setAdding] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [iconDraft, setIconDraft] = useState('others');
  const [colorDraft, setColorDraft] = useState('#A8ADA8');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const openEdit = (c: Category) => {
    setEditing(c);
    setAdding(false);
    setNameDraft(c.name);
    setIconDraft(c.icon);
    setColorDraft(c.color);
    setError(null);
    setConfirmDelete(false);
  };

  const openAdd = () => {
    setEditing(null);
    setAdding(true);
    setNameDraft('');
    setIconDraft('others');
    setColorDraft('#A8ADA8');
    setError(null);
    setConfirmDelete(false);
  };

  const close = () => {
    setEditing(null);
    setAdding(false);
  };

  const sheetOpen = editing !== null || adding;

  const save = () => {
    if (!nameDraft.trim()) {
      setError('Give the category a name.');
      return;
    }
    if (adding) {
      if (!addCategory(nameDraft, iconDraft, colorDraft)) {
        setError('A category with this name already exists.');
        return;
      }
    } else if (editing) {
      updateCategory(editing.id, { name: nameDraft, icon: iconDraft, color: colorDraft });
    }
    close();
  };

  const rows = useMemo(() => {
    const amounts = new Map(breakdown.map((b) => [b.category, b]));
    return [...categories]
      .map((c) => ({
        cat: c,
        amountMinor: amounts.get(c.name)?.amountMinor ?? 0,
        share: amounts.get(c.name)?.share ?? 0,
      }))
      .sort((a, b) => b.amountMinor - a.amountMinor);
  }, [categories, breakdown]);

  return (
    <div className="pad">
      <ScreenHeader
        title="Categories"
        onBack={nav.pop}
        right={
          <button type="button" className="icon-btn" onClick={openAdd} aria-label="Add category">
            <Plus size={22} />
          </button>
        }
      />

      <div className="cats-header">
        <p className="cats-total">{monthLabel(now)} spending</p>
        <strong className="cats-amount">{formatMoney(total)}</strong>
      </div>

      <div className="cats-grid stagger">
        {rows.map(({ cat, amountMinor, share }, i) => {
          const Icon = getIcon(cat.icon);
          const color = cat.isCustom ? cat.color : categoryColor(cat.name);
          return (
            <div key={cat.id} style={{ '--i': String(i) } as React.CSSProperties}>
              <CategoryCard
                icon={Icon}
                name={cat.name}
                color={color}
                amountMinor={amountMinor}
                share={share}
                onClick={() => openEdit(cat)}
              />
            </div>
          );
        })}
      </div>

      <Sheet open={sheetOpen} onClose={close} title={adding ? 'New category' : 'Edit category'}>
        <label className="field-label">Name</label>
        <input
          className="input"
          value={nameDraft}
          maxLength={24}
          onChange={(e) => setNameDraft(e.target.value)}
          placeholder="e.g. Pets"
        />
        {error && <p className="field-error">{error}</p>}

        <label className="field-label">Icon</label>
        <div className="icon-grid">
          {ICON_KEYS.map((key) => {
            const Icon = getIcon(key);
            return (
              <button
                type="button"
                key={key}
                className={`icon-cell ${iconDraft === key ? 'is-on' : ''}`}
                onClick={() => setIconDraft(key)}
                aria-label={`Icon ${key}`}
              >
                <Icon size={19} />
              </button>
            );
          })}
        </div>

        <label className="field-label">Color</label>
        <div className="color-row">
          {COLOR_SWATCHES.map((c) => (
            <button
              type="button"
              key={c}
              className={`swatch ${colorDraft === c ? 'is-on' : ''}`}
              style={{ background: c }}
              onClick={() => setColorDraft(c)}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>

        <div className="sheet-actions">
          <Button block onClick={save}>
            {adding ? 'Add category' : 'Save changes'}
          </Button>
          {editing?.isCustom && (
            <Button
              block
              variant="danger"
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                deleteCategory(editing.id);
                close();
              }}
            >
              {confirmDelete ? 'Tap again to confirm delete' : (
                <>
                  <Trash2 size={16} /> Delete category
                </>
              )}
            </Button>
          )}
          {editing && !editing.isCustom && (
            <p className="field-hint">
              Default categories can be renamed and restyled; deleting is reserved for
              custom ones. Deleting moves its transactions to Others.
            </p>
          )}
        </div>
      </Sheet>
    </div>
  );
}
