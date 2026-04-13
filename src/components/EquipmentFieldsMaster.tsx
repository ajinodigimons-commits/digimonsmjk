import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, GripVertical, Type, List, Calendar, Hash, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCategories, useEquipmentFields, useEquipmentFieldMutations, EquipmentFieldRow } from '@/hooks/useSupabaseData';

type FieldType = 'text' | 'dropdown' | 'date' | 'number';

const FIELD_TYPE_LABELS: Record<FieldType, { label: string; icon: typeof Type }> = {
  text: { label: 'Isian Bebas', icon: Type },
  dropdown: { label: 'Dropdown', icon: List },
  date: { label: 'Tanggal', icon: Calendar },
  number: { label: 'Angka', icon: Hash },
};

const EquipmentFieldsMaster = () => {
  const { toast } = useToast();
  const { data: categories = [] } = useCategories();
  const { data: fields = [], isLoading } = useEquipmentFields();
  const { add, update, remove } = useEquipmentFieldMutations();
  const categoryNames = categories.map(c => c.name);

  const [selectedCategory, setSelectedCategory] = useState<string>(categoryNames[0] || 'APAR');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLabel, setFormLabel] = useState('');
  const [formFieldName, setFormFieldName] = useState('');
  const [formType, setFormType] = useState<FieldType>('text');
  const [formRequired, setFormRequired] = useState(false);
  const [formOptions, setFormOptions] = useState<string[]>(['Opsi 1', 'Opsi 2']);
  const [newOption, setNewOption] = useState('');

  const filtered = useMemo(() =>
    fields.filter(f => f.category === selectedCategory).sort((a, b) => a.sort_order - b.sort_order),
    [fields, selectedCategory]
  );

  // Auto-select first category when categories load
  useMemo(() => {
    if (categoryNames.length > 0 && !categoryNames.includes(selectedCategory)) {
      setSelectedCategory(categoryNames[0]);
    }
  }, [categoryNames]);

  const openAdd = () => {
    setEditingId(null);
    setFormLabel('');
    setFormFieldName('');
    setFormType('text');
    setFormRequired(false);
    setFormOptions(['Opsi 1', 'Opsi 2']);
    setNewOption('');
    setShowForm(true);
  };

  const openEdit = (field: EquipmentFieldRow) => {
    setEditingId(field.id);
    setFormLabel(field.field_label);
    setFormFieldName(field.field_name);
    setFormType(field.field_type as FieldType);
    setFormRequired(field.is_required);
    setFormOptions((field.options as string[]) || ['Opsi 1', 'Opsi 2']);
    setNewOption('');
    setShowForm(true);
  };

  const addOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed || formOptions.includes(trimmed)) return;
    setFormOptions([...formOptions, trimmed]);
    setNewOption('');
  };

  const removeOption = (idx: number) => {
    if (formOptions.length <= 2) return;
    setFormOptions(formOptions.filter((_, i) => i !== idx));
  };

  const generateFieldName = (label: string) => {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  };

  const handleSave = async () => {
    if (!formLabel.trim()) {
      toast({ title: 'Error', description: 'Label pertanyaan wajib diisi', variant: 'destructive' });
      return;
    }
    const fieldName = formFieldName || generateFieldName(formLabel);
    try {
      if (editingId) {
        await update.mutateAsync({
          id: editingId,
          field_label: formLabel.trim(),
          field_name: fieldName,
          field_type: formType,
          is_required: formRequired,
          options: formType === 'dropdown' ? formOptions : null,
        });
        toast({ title: 'Berhasil', description: 'Pertanyaan berhasil diupdate' });
      } else {
        const maxOrder = filtered.length > 0 ? Math.max(...filtered.map(f => f.sort_order)) : 0;
        await add.mutateAsync({
          category: selectedCategory,
          field_label: formLabel.trim(),
          field_name: fieldName,
          field_type: formType,
          is_required: formRequired,
          options: formType === 'dropdown' ? formOptions : null,
          sort_order: maxOrder + 1,
        });
        toast({ title: 'Berhasil', description: 'Pertanyaan baru berhasil ditambahkan' });
      }
      setShowForm(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    await remove.mutateAsync(id);
    toast({ title: 'Dihapus', description: 'Pertanyaan berhasil dihapus' });
  };

  const TypeIcon = ({ type }: { type: string }) => {
    const Icon = FIELD_TYPE_LABELS[type as FieldType]?.icon || Type;
    return <Icon className="h-3 w-3" />;
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground text-sm">Memuat...</div>;

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categoryNames.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              selectedCategory === cat ? 'gradient-accent text-accent-foreground shadow-card' : 'bg-card text-muted-foreground border border-border'
            }`}>{cat}</button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="glass-card rounded-xl p-4 flex-1 mr-2">
          <h3 className="font-display text-sm font-semibold mb-1">Master Pertanyaan — {selectedCategory}</h3>
          <p className="text-xs text-muted-foreground">{filtered.length} pertanyaan untuk pengisian data alat</p>
        </div>
        <Button onClick={openAdd} className="gradient-accent text-accent-foreground rounded-xl shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Belum ada pertanyaan untuk {selectedCategory}</p>
            <p className="text-muted-foreground text-xs mt-1">Tambahkan pertanyaan untuk form data alat</p>
          </div>
        ) : (
          filtered.map((field, idx) => (
            <div key={field.id} className="glass-card rounded-xl p-4 flex items-start gap-3">
              <div className="flex items-center gap-2 mt-0.5">
                <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                <span className="text-accent font-display font-bold text-sm">{idx + 1}.</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{field.field_label}</p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    <TypeIcon type={field.field_type} />
                    {FIELD_TYPE_LABELS[field.field_type as FieldType]?.label || field.field_type}
                  </span>
                  {field.is_required && (
                    <span className="rounded-lg bg-destructive/10 text-destructive px-2 py-0.5 text-[10px] font-medium">
                      Wajib
                    </span>
                  )}
                  {field.field_type === 'dropdown' && field.options && (
                    <span className="text-[10px] text-muted-foreground">
                      ({(field.options as string[]).join(' / ')})
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(field)}>
                  <Pencil className="h-3.5 w-3.5 text-safety-blue" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(field.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-safety-red" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-2xl max-w-sm mx-auto max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editingId ? 'Edit' : 'Tambah'} Pertanyaan — {selectedCategory}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm">Label Pertanyaan</Label>
              <Input value={formLabel} onChange={e => {
                setFormLabel(e.target.value);
                if (!editingId) setFormFieldName(generateFieldName(e.target.value));
              }} placeholder="Contoh: Lokasi, Status, Berat Netto..." className="rounded-xl" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Tipe Input</Label>
              <Select value={formType} onValueChange={(v: FieldType) => setFormType(v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map(key => {
                    const { label, icon: Icon } = FIELD_TYPE_LABELS[key];
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5" />{label}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {formType === 'dropdown' && (
              <div className="space-y-2">
                <Label className="text-sm">Opsi Dropdown</Label>
                <div className="space-y-1.5">
                  {formOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex-1 rounded-xl border border-input bg-card px-3 py-2 text-sm">{opt}</div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeOption(idx)}>
                        <X className="h-3.5 w-3.5 text-safety-red" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={newOption} onChange={e => setNewOption(e.target.value)} placeholder="Tambah opsi baru..." className="rounded-xl"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())} />
                  <Button variant="outline" className="rounded-xl shrink-0" onClick={addOption}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-xl border border-input p-3">
              <Label className="text-sm">Wajib diisi?</Label>
              <Switch checked={formRequired} onCheckedChange={setFormRequired} />
            </div>

            <Button onClick={handleSave} disabled={add.isPending || update.isPending} className="w-full gradient-accent text-accent-foreground font-semibold rounded-xl">
              {editingId ? 'Simpan Perubahan' : 'Tambah Pertanyaan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EquipmentFieldsMaster;
