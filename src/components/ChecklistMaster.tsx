import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, GripVertical, List, Type, Calendar, Hash, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCategories, useChecklistItems, useChecklistItemMutations, ChecklistItemRow } from '@/hooks/useSupabaseData';

type QuestionType = 'multiple_choice' | 'text' | 'date' | 'number';

const QUESTION_TYPE_LABELS: Record<QuestionType, { label: string; icon: typeof List }> = {
  multiple_choice: { label: 'Pilihan Ganda', icon: List },
  text: { label: 'Jawaban Bebas', icon: Type },
  date: { label: 'Tanggal', icon: Calendar },
  number: { label: 'Jumlah / Angka', icon: Hash },
};

const ChecklistMaster = () => {
  const { toast } = useToast();
  const { data: categories = [] } = useCategories();
  const { data: items = [], isLoading } = useChecklistItems();
  const { add, update, remove } = useChecklistItemMutations();
  const categoryNames = categories.map(c => c.name);

  const [selectedCategory, setSelectedCategory] = useState<string>(categoryNames[0] || 'APAR');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formQuestion, setFormQuestion] = useState('');
  const [formType, setFormType] = useState<QuestionType>('multiple_choice');
  const [formOptions, setFormOptions] = useState<string[]>(['Ya', 'Tidak']);
  const [newOption, setNewOption] = useState('');

  const filtered = useMemo(() =>
    items.filter(i => i.category === selectedCategory).sort((a, b) => a.sort_order - b.sort_order),
    [items, selectedCategory]
  );

  const openAdd = () => {
    setEditingId(null);
    setFormQuestion('');
    setFormType('multiple_choice');
    setFormOptions(['Ya', 'Tidak']);
    setNewOption('');
    setShowForm(true);
  };

  const openEdit = (item: ChecklistItemRow) => {
    setEditingId(item.id);
    setFormQuestion(item.question);
    setFormType((item.question_type as QuestionType) || 'multiple_choice');
    setFormOptions((item.options as string[]) || ['Ya', 'Tidak']);
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

  const handleSave = async () => {
    if (!formQuestion.trim()) {
      toast({ title: 'Error', description: 'Pertanyaan wajib diisi', variant: 'destructive' });
      return;
    }
    try {
      if (editingId) {
        await update.mutateAsync({
          id: editingId,
          question: formQuestion.trim(),
          question_type: formType,
          options: formType === 'multiple_choice' ? formOptions : null,
        });
        toast({ title: 'Berhasil', description: 'Soal berhasil diupdate' });
      } else {
        const maxOrder = filtered.length > 0 ? Math.max(...filtered.map(i => i.sort_order)) : 0;
        await add.mutateAsync({
          category: selectedCategory,
          question: formQuestion.trim(),
          question_type: formType,
          options: formType === 'multiple_choice' ? formOptions : null,
          sort_order: maxOrder + 1,
        });
        toast({ title: 'Berhasil', description: 'Soal baru berhasil ditambahkan' });
      }
      setShowForm(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    await remove.mutateAsync(id);
    toast({ title: 'Dihapus', description: 'Soal berhasil dihapus' });
  };

  const TypeIcon = ({ type }: { type: string }) => {
    const Icon = QUESTION_TYPE_LABELS[type as QuestionType]?.icon || List;
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
          <h3 className="font-display text-sm font-semibold mb-1">Master Checklist — {selectedCategory}</h3>
          <p className="text-xs text-muted-foreground">{filtered.length} soal pengecekan</p>
        </div>
        <Button onClick={openAdd} className="gradient-accent text-accent-foreground rounded-xl shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="text-muted-foreground text-sm">Belum ada soal untuk {selectedCategory}</p>
          </div>
        ) : (
          filtered.map((item, idx) => (
            <div key={item.id} className="glass-card rounded-xl p-4 flex items-start gap-3">
              <div className="flex items-center gap-2 mt-0.5">
                <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                <span className="text-accent font-display font-bold text-sm">{idx + 1}.</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{item.question}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    <TypeIcon type={item.question_type} />
                    {QUESTION_TYPE_LABELS[item.question_type as QuestionType]?.label || item.question_type}
                  </span>
                  {item.question_type === 'multiple_choice' && item.options && (
                    <span className="text-[10px] text-muted-foreground">
                      ({(item.options as string[]).join(' / ')})
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                  <Pencil className="h-3.5 w-3.5 text-safety-blue" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(item.id)}>
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
            <DialogTitle className="font-display">{editingId ? 'Edit' : 'Tambah'} Soal — {selectedCategory}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm">Pertanyaan</Label>
              <Input value={formQuestion} onChange={e => setFormQuestion(e.target.value)} placeholder="Masukkan pertanyaan checklist..." className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Tipe Jawaban</Label>
              <Select value={formType} onValueChange={(v: QuestionType) => setFormType(v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map(key => {
                    const { label, icon: Icon } = QUESTION_TYPE_LABELS[key];
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5" />{label}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {formType === 'multiple_choice' && (
              <div className="space-y-2">
                <Label className="text-sm">Opsi Jawaban</Label>
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
            <Button onClick={handleSave} disabled={add.isPending || update.isPending} className="w-full gradient-accent text-accent-foreground font-semibold rounded-xl">
              {editingId ? 'Simpan Perubahan' : 'Tambah Soal'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChecklistMaster;
