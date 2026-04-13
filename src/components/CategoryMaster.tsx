import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCategories, useCategoryMutations, CategoryRow } from '@/hooks/useSupabaseData';

const CategoryMaster = () => {
  const { toast } = useToast();
  const { data: items = [], isLoading } = useCategories();
  const { add, update, remove } = useCategoryMutations();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formPeriod, setFormPeriod] = useState('3');
  const [formHasExpiry, setFormHasExpiry] = useState(false);

  const openAdd = () => {
    setEditingId(null);
    setFormName('');
    setFormPeriod('3');
    setFormHasExpiry(false);
    setShowForm(true);
  };

  const openEdit = (item: CategoryRow) => {
    setEditingId(item.id);
    setFormName(item.name);
    setFormPeriod(item.period_months.toString());
    setFormHasExpiry(item.has_expiry);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: 'Error', description: 'Nama kategori wajib diisi', variant: 'destructive' });
      return;
    }
    try {
      if (editingId) {
        await update.mutateAsync({ id: editingId, name: formName.trim(), period_months: Number(formPeriod), has_expiry: formHasExpiry });
        toast({ title: 'Berhasil', description: 'Kategori berhasil diupdate' });
      } else {
        await add.mutateAsync({ name: formName.trim(), period_months: Number(formPeriod), has_expiry: formHasExpiry });
        toast({ title: 'Berhasil', description: 'Kategori baru berhasil ditambahkan' });
      }
      setShowForm(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    await remove.mutateAsync(id);
    toast({ title: 'Dihapus', description: 'Kategori berhasil dihapus' });
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground text-sm">Memuat...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="glass-card rounded-xl p-4 flex-1 mr-2">
          <h3 className="font-display text-sm font-semibold mb-1">Master Kategori Alat</h3>
          <p className="text-xs text-muted-foreground">{items.length} kategori terdaftar</p>
        </div>
        <Button onClick={openAdd} className="gradient-accent text-accent-foreground rounded-xl shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {items.map(item => (
        <div key={item.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-display text-sm font-semibold">{item.name}</p>
            <p className="text-xs text-muted-foreground">
              Pengecekan {item.period_months} bulan sekali
              {item.has_expiry && ' • Ada kedaluwarsa'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
              <Pencil className="h-3.5 w-3.5 text-safety-blue" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(item.id)}>
              <Trash2 className="h-3.5 w-3.5 text-safety-red" />
            </Button>
          </div>
        </div>
      ))}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-2xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editingId ? 'Edit' : 'Tambah'} Kategori</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm">Nama Kategori</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Contoh: Gas Detector" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Periode Pengecekan (bulan)</Label>
              <Input type="number" min={1} value={formPeriod} onChange={e => setFormPeriod(e.target.value)} className="rounded-xl" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="hasExpiry" checked={formHasExpiry} onChange={e => setFormHasExpiry(e.target.checked)} className="rounded border-input" />
              <Label htmlFor="hasExpiry" className="text-sm">Ada tanggal kedaluwarsa</Label>
            </div>
            <Button onClick={handleSave} disabled={add.isPending || update.isPending} className="w-full gradient-accent text-accent-foreground font-semibold rounded-xl">
              {editingId ? 'Simpan Perubahan' : 'Tambah Kategori'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryMaster;
