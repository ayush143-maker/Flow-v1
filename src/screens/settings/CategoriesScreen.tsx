import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '@/services/store/AppStoreProvider';
import { useNav } from '@/navigation/NavigationProvider';
import { getIcon, ICONS } from '@/components/icons';
import { Button, ScreenHeader, Sheet } from '@/components/ui';
import { categoryBreakdown, inRange, monthToDate } from '@/services/analytics/derive';
import { formatMoney } from '@/utils/format';
import { categoryColor } from '@/theme/tokens';
import type { Category } from '@/types';

const COLOR_SWATCHES = [
  '#FF7A59', '#F5A524', '#4ADE80', '#2FD6B3', '#38BDF8',
  '#7C6CF0', '#A78BFA', '#F472B6', '#94A3B8', '#8B97AC',
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
  const [colorDraft, setColorDraft] = useState('#8B97AC');
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
    setColorDraft('#8B97AC');
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

      <p className="cat-total">
        {formatMoney(total)} spent this month · {rows.length} categories
      </p>

      <div className="card">
        {rows.map(({ cat, amountMinor, share }) => {
          const Icon = getIcon(cat.icon);
          return (
            <button type="button" key={cat.id} className="cat-row" onClick={() => openEdit(cat)}>
              <span className="cat-row-icon" style={{ background: `${cat.color}22`, color: cat.color }}>
                <Icon size={19} />
              </span>
              <div className="cat-row-body">
                <strong>
                  {cat.name}
                  {cat.isCustom && <span className="custom-badge">custom</span>}
                </strong>
                <span className="cat-bar">
                  <span style={{ width: `${Math.round(share * 100)}%`, background: cat.color }} />
                </span>
              </div>
              <div className="cat-row-nums">
                <strong>{formatMoney(amountMinor)}</strong>
                <span>{Math.round(share * 100)}%</span>
              </div>
            </button>
          );
        })}
      </div>

      <Sheet open={sheetOpen} onClose={close} title={adding ? 'New category' : 'Edit category'}>
        <label className="field-label">Name</label>
        <input
          className="input"
          value={nameDraft}
          maxLength={24}
          disabled={!adding && editing ? !editing.isCustom && false : false}
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
          <Button block onClick={save}>{adding ? 'Add category' : 'Save changes'}</Button>
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
