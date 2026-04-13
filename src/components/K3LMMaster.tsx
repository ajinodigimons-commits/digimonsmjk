import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useProfiles, ProfileRow } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';

const K3LMMaster = () => {
  const { toast } = useToast();
  const { data: profiles = [], isLoading, refetch } = useProfiles();
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ProfileRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProfileRow | null>(null);
  const [formName, setFormName] = useState('');
  const [formSection, setFormSection] = useState('');
  const [formPassword, setFormPassword] = useState('ajinomoto123');
  const [isSaving, setIsSaving] = useState(false);

  const openAdd = () => {
    setEditingProfile(null);
    setFormName('');
    setFormSection('');
    setFormPassword('ajinomoto123');
    setShowForm(true);
  };

  const openEdit = (profile: ProfileRow) => {
    setEditingProfile(profile);
    setFormName(profile.name);
    setFormSection(profile.section || '');
    setFormPassword('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formSection.trim()) {
      toast({ title: 'Error', description: 'Nama dan section wajib diisi', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      if (editingProfile) {
        // Update existing user via edge function
        const res = await supabase.functions.invoke('update-user', {
          body: {
            user_id: editingProfile.id,
            name: formName.trim(),
            section: formSection.trim(),
            password: formPassword && formPassword.length >= 6 ? formPassword : undefined,
          },
        });
        if (res.error) throw new Error(res.error.message || 'Gagal menghubungi server');
        if (res.data?.error) throw new Error(res.data.error);
        toast({ title: 'Berhasil', description: 'Data K3LM berhasil diperbarui' });
      } else {
        // Create new user
        if (formPassword.length < 6) {
          toast({ title: 'Error', description: 'Password minimal 6 karakter', variant: 'destructive' });
          setIsSaving(false);
          return;
        }
        const sanitized = formName.trim().toLowerCase().replace(/[^a-z0-9]/g, '.');
        const email = `${sanitized}.${Date.now()}@k3lm.digimons.local`;

        const res = await supabase.functions.invoke('create-user', {
          body: { email, password: formPassword, name: formName.trim(), section: formSection.trim(), role: 'user' },
        });
        if (res.error) throw new Error(res.error.message || 'Gagal menghubungi server');
        if (res.data?.error) throw new Error(res.data.error);
        toast({ title: 'Berhasil', description: 'K3LM baru berhasil ditambahkan' });
      }

      setShowForm(false);
      setTimeout(() => refetch(), 500);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      const res = await supabase.functions.invoke('delete-user', {
        body: { user_id: deleteTarget.id },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: 'Berhasil', description: 'K3LM berhasil dihapus' });
      setDeleteTarget(null);
      setTimeout(() => refetch(), 500);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Filter out admin from display
  const k3lmProfiles = profiles.filter(p => !(p as any).email?.includes('@hse.digimons.local'));

  if (isLoading) return <div className="text-center py-8 text-muted-foreground text-sm">Memuat...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="glass-card rounded-xl p-4 flex-1 mr-2">
          <h3 className="font-display text-sm font-semibold mb-1">Master K3LM / Section</h3>
          <p className="text-xs text-muted-foreground">Daftar semua K3LM yang terdaftar ({k3lmProfiles.length})</p>
        </div>
        <Button onClick={openAdd} className="gradient-accent text-accent-foreground rounded-xl shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {k3lmProfiles.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-muted-foreground text-sm">Belum ada data K3LM</p>
        </div>
      ) : (
        k3lmProfiles.map(k => (
          <div key={k.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-display text-sm font-semibold">{k.name}</p>
              <p className="text-xs text-muted-foreground">{k.section || '-'}</p>
              {k.default_password && (
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Password default: <span className="font-mono">{k.default_password}</span></p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-accent" onClick={() => openEdit(k)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(k)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-2xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingProfile ? 'Edit K3LM' : 'Tambah K3LM (User Baru)'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm">Nama K3LM</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nama K3LM..." className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Section</Label>
              <Input value={formSection} onChange={e => setFormSection(e.target.value)} placeholder="Section..." className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">
                {editingProfile ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password'}
              </Label>
              <Input value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder={editingProfile ? 'Kosongkan jika tidak diubah...' : 'Password...'} className="rounded-xl" />
            </div>
            <Button onClick={handleSave} disabled={isSaving} className="w-full gradient-accent text-accent-foreground font-semibold rounded-xl">
              {isSaving ? 'Menyimpan...' : editingProfile ? 'Simpan Perubahan' : 'Tambah K3LM'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus K3LM?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus <strong>{deleteTarget?.name}</strong>? Tindakan ini tidak dapat dibatalkan dan semua data terkait akan ikut terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSaving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              {isSaving ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default K3LMMaster;
