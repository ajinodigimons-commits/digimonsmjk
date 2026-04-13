import { useState, useMemo, useRef } from 'react';
import { format, addMonths, isBefore } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, AlertTriangle, Filter, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  useCategories, useEquipments, useEquipmentMutations, useEquipmentFields,
  useEquipmentFieldValues, useEquipmentFieldValueMutations, useInspections,
  useProfiles, EquipmentRow, EquipmentFieldRow
} from '@/hooks/useSupabaseData';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const isExpiringSoon = (dateStr?: string | null): boolean => {
  if (!dateStr) return false;
  const diff = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diff <= 30 && diff > 0;
};

const isExpired = (dateStr?: string | null): boolean => {
  if (!dateStr) return false;
  return new Date(dateStr) <= new Date();
};

const isCheckOverdue = (
  equipmentId: string,
  periodMonths: number,
  results: { equipment_id: string; checked_at: string }[]
): boolean => {
  const eqResults = results.filter(r => r.equipment_id === equipmentId);
  if (eqResults.length === 0) return true;
  const latestMs = eqResults.reduce((max, r) => {
    const d = new Date(r.checked_at).getTime();
    return d > max ? d : max;
  }, 0);
  const deadline = addMonths(new Date(latestMs), periodMonths);
  return isBefore(deadline, new Date());
};

const hasNeverBeenInspected = (
  equipmentId: string,
  results: { equipment_id: string }[]
): boolean => {
  return !results.some(r => r.equipment_id === equipmentId);
};

// Fixed columns in the equipments table
const FIXED_COLUMNS: Record<string, keyof EquipmentRow> = {
  lokasi: 'lokasi',
  status: 'status',
  jenis_apar: 'jenis_apar',
  berat_netto: 'berat_netto',
  tanggal_kedaluwarsa: 'tanggal_kedaluwarsa',
};

interface MasterDataProps {
  showAllUsers?: boolean;
}

type StatusFilterValue = 'never_inspected' | 'overdue' | 'warning_expired' | 'expired';

const MasterData = ({ showAllUsers = false }: MasterDataProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: categories = [] } = useCategories();
  const { data: equipments = [], isLoading } = useEquipments(showAllUsers);
  const { data: allFields = [] } = useEquipmentFields();
  const { data: results = [] } = useInspections();
  const { data: profiles = [] } = useProfiles();
  const { add, update, remove } = useEquipmentMutations();
  const { upsertMany } = useEquipmentFieldValueMutations();
  const queryClient = useQueryClient();

  const categoryNames = categories.map(c => c.name);
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryNames[0] || 'APAR');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilters, setStatusFilters] = useState<StatusFilterValue[]>([]);
  const [filterK3lm, setFilterK3lm] = useState('');

  const catObj = categories.find(c => c.name === selectedCategory);
  const hasExpiry = catObj?.has_expiry ?? false;
  const periodMonths = catObj?.period_months ?? 3;

  // K3LM sections for admin filter
  const k3lmSections = useMemo(() => {
    return [...new Set(profiles.map(p => p.section).filter(Boolean))] as string[];
  }, [profiles]);

  // Profile lookup
  const profileMap = useMemo(() => {
    const map: Record<string, { name: string; section: string | null }> = {};
    profiles.forEach(p => { map[p.id] = { name: p.name, section: p.section }; });
    return map;
  }, [profiles]);

  const getAllStatuses = (eq: EquipmentRow): { key: StatusFilterValue | 'active'; label: string; className: string }[] => {
    const statuses: { key: StatusFilterValue | 'active'; label: string; className: string }[] = [];
    const neverInspected = hasNeverBeenInspected(eq.id, results);
    const overdue = !neverInspected && isCheckOverdue(eq.id, periodMonths, results);

    if (eq.status === 'Non Aktif') {
      statuses.push({ key: 'active', label: 'Non Aktif', className: 'bg-destructive/10 text-destructive' });
    }
    if (neverInspected) {
      statuses.push({ key: 'never_inspected', label: 'Belum Inspeksi', className: 'bg-destructive/10 text-destructive' });
    }
    if (overdue) {
      statuses.push({ key: 'overdue', label: 'Terlambat', className: 'bg-destructive/10 text-destructive' });
    }
    if (hasExpiry && isExpired(eq.tanggal_kedaluwarsa)) {
      statuses.push({ key: 'expired', label: 'Expired', className: 'bg-destructive/10 text-destructive' });
    } else if (hasExpiry && isExpiringSoon(eq.tanggal_kedaluwarsa)) {
      statuses.push({ key: 'warning_expired', label: 'Warning Expired', className: 'bg-amber-500/10 text-amber-600' });
    }
    if (statuses.length === 0) {
      statuses.push({ key: 'active', label: 'Aktif', className: 'bg-emerald-500/10 text-emerald-600' });
    }
    return statuses;
  };

  const filtered = useMemo(() => {
    let list = equipments
      .filter(e => e.category === selectedCategory)
      .filter(e => showAllUsers || e.user_id === user?.id)
      .filter(e => !search || e.kode.toLowerCase().includes(search.toLowerCase()) || e.lokasi.toLowerCase().includes(search.toLowerCase()));

    // K3LM filter (admin only)
    if (filterK3lm && showAllUsers) {
      const userIdsInSection = profiles.filter(p => p.section === filterK3lm).map(p => p.id);
      list = list.filter(e => userIdsInSection.includes(e.user_id));
    }

    // Multi-select status filters (OR logic)
    if (statusFilters.length > 0) {
      list = list.filter(e => {
        const statuses = getAllStatuses(e);
        return statusFilters.some(f => statuses.some(s => s.key === f));
      });
    }

    return list;
  }, [equipments, selectedCategory, user, showAllUsers, search, filterK3lm, profiles, statusFilters, results, periodMonths, hasExpiry]);

  // Load dynamic field values for visible equipments
  const equipmentIds = useMemo(() => filtered.map(e => e.id), [filtered]);
  const { data: fieldValues = [] } = useEquipmentFieldValues(equipmentIds);

  // Get dynamic fields for the selected category
  const categoryFields = useMemo(() => {
    return allFields
      .filter(f => f.category === selectedCategory)
      .filter(f => {
        if (f.field_name === 'tanggal_kedaluwarsa' && !hasExpiry) return false;
        return true;
      })
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [allFields, selectedCategory, hasExpiry]);

  const isFixedColumn = (fieldName: string) => fieldName in FIXED_COLUMNS;

  const getFieldValue = (eq: EquipmentRow, fieldName: string): string => {
    if (isFixedColumn(fieldName)) {
      const col = FIXED_COLUMNS[fieldName];
      const val = eq[col];
      return val != null ? String(val) : '';
    }
    const fv = fieldValues.find(v => v.equipment_id === eq.id && v.field_name === fieldName);
    return fv?.field_value || '';
  };

  const resetForm = () => {
    setFormData({});
    setEditingId(null);
  };

  const openAdd = () => {
    resetForm();
    const defaults: Record<string, string> = {};
    categoryFields.forEach(f => {
      if (f.field_name === 'status') defaults[f.field_name] = 'Aktif';
      else defaults[f.field_name] = '';
    });
    setFormData(defaults);
    setShowForm(true);
  };

  const openEdit = (eq: EquipmentRow) => {
    setEditingId(eq.id);
    const data: Record<string, string> = {};
    categoryFields.forEach(f => {
      data[f.field_name] = getFieldValue(eq, f.field_name);
    });
    setFormData(data);
    setShowForm(true);
  };

  const setField = (fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSave = async () => {
    for (const f of categoryFields) {
      if (f.is_required && !formData[f.field_name]?.trim()) {
        toast({ title: 'Error', description: `${f.field_label} wajib diisi`, variant: 'destructive' });
        return;
      }
    }

    try {
      const fixedRecord: Record<string, any> = {
        lokasi: formData['lokasi'] || '',
        status: formData['status'] || 'Aktif',
        jenis_apar: formData['jenis_apar'] || null,
        berat_netto: formData['berat_netto'] ? Number(formData['berat_netto']) : null,
        tanggal_kedaluwarsa: hasExpiry && formData['tanggal_kedaluwarsa'] ? formData['tanggal_kedaluwarsa'] : null,
      };

      const dynamicFields = categoryFields.filter(f => !isFixedColumn(f.field_name));
      let equipmentId = editingId;

      if (editingId) {
        await update.mutateAsync({ id: editingId, ...fixedRecord });
        toast({ title: 'Berhasil', description: 'Data alat berhasil diupdate' });
      } else {
        const userSection = profileMap[user?.id || '']?.section || user?.name?.replace(/\s+/g, '') || '';
        const lokasi = (fixedRecord.lokasi || '').replace(/\s+/g, '');
        const baseKode = `${selectedCategory}-${userSection}-${lokasi}`;
        
        // Cek duplikat di database: cari semua kode yang dimulai dengan baseKode
        const { supabase: sbCheck } = await import('@/integrations/supabase/client');
        const { data: existing } = await sbCheck
          .from('equipments')
          .select('kode')
          .like('kode', `${baseKode}%`);
        
        let kode = baseKode;
        if (existing && existing.length > 0) {
          // Cari nomor urut tertinggi
          const existingKodes = existing.map(e => e.kode);
          if (existingKodes.includes(baseKode)) {
            // Cari angka tertinggi dari suffix (2), (3), dst
            let maxNum = 1;
            for (const k of existingKodes) {
              const match = k.match(/\((\d+)\)$/);
              if (match) {
                maxNum = Math.max(maxNum, parseInt(match[1]));
              }
            }
            kode = `${baseKode}(${maxNum + 1})`;
          }
        }
        
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: inserted, error } = await supabase.from('equipments').insert({
          kode,
          category: selectedCategory,
          user_id: user?.id || '',
          last_check_date: null as string | null,
          lokasi: fixedRecord.lokasi || '',
          status: fixedRecord.status || 'Aktif',
          jenis_apar: fixedRecord.jenis_apar || null,
          berat_netto: fixedRecord.berat_netto || null,
          tanggal_kedaluwarsa: fixedRecord.tanggal_kedaluwarsa || null,
        }).select('id').single();
        if (error) throw error;
        equipmentId = inserted!.id;
        
        toast({ title: 'Berhasil', description: 'Alat baru berhasil ditambahkan' });
      }

      if (equipmentId && dynamicFields.length > 0) {
        const values = dynamicFields.map(f => ({
          equipment_id: equipmentId!,
          field_name: f.field_name,
          field_value: formData[f.field_name] || null,
        }));
        await upsertMany.mutateAsync(values);
      }

      queryClient.invalidateQueries({ queryKey: ['equipments'] });
      queryClient.invalidateQueries({ queryKey: ['equipment_field_values'] });
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deleteId) return;
    await remove.mutateAsync(deleteId);
    toast({ title: 'Dihapus', description: 'Data alat berhasil dihapus' });
    setDeleteId(null);
  };


  const getStatusDisplay = (eq: EquipmentRow) => {
    const statuses = getAllStatuses(eq);
    return statuses[0];
  };

  const renderFormField = (field: EquipmentFieldRow) => {
    const value = formData[field.field_name] || '';

    switch (field.field_type) {
      case 'dropdown':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="text-sm">{field.field_label}</Label>
            <Select value={value} onValueChange={v => setField(field.field_name, v)}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder={`Pilih ${field.field_label.toLowerCase()}...`} /></SelectTrigger>
              <SelectContent>
                {(field.options as string[] || []).map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="text-sm">{field.field_label}</Label>
            <Input type="date" value={value} onChange={e => setField(field.field_name, e.target.value)} className="rounded-xl" />
          </div>
        );
      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="text-sm">{field.field_label}</Label>
            <Input type="number" value={value} onChange={e => setField(field.field_name, e.target.value)} placeholder="0" className="rounded-xl" />
          </div>
        );
      default:
        return (
          <div key={field.id} className="space-y-2">
            <Label className="text-sm">{field.field_label}</Label>
            <Input value={value} onChange={e => setField(field.field_name, e.target.value)} placeholder={`${field.field_label}...`} className="rounded-xl" />
          </div>
        );
    }
  };

  const getEquipmentDetails = (eq: EquipmentRow) => {
    const details: string[] = [];
    const detailFields = allFields
      .filter(f => f.category === eq.category)
      .filter(f => !['lokasi', 'status'].includes(f.field_name))
      .filter(f => f.field_name !== 'tanggal_kedaluwarsa' || hasExpiry)
      .sort((a, b) => a.sort_order - b.sort_order);

    detailFields.forEach(f => {
      const val = getFieldValue(eq, f.field_name);
      if (!val) return;
      if (f.field_name === 'tanggal_kedaluwarsa') {
        details.push(`Exp: ${format(new Date(val), 'dd MMM yy')}`);
      } else {
        details.push(`${f.field_label}: ${val}`);
      }
    });
    return details;
  };

  // ========== EXPORT FUNCTIONS ==========
  const getExportData = () => {
    return filtered.map(eq => {
      const status = getStatusDisplay(eq);
      const k3lm = profileMap[eq.user_id]?.section || '-';
      return {
        'Kode': eq.kode,
        'Lokasi': eq.lokasi,
        'Status': status.label,
        'K3LM': k3lm,
        'Cek Terakhir': eq.last_check_date ? format(new Date(eq.last_check_date), 'dd MMM yy') : 'Belum pernah',
        ...(hasExpiry && eq.tanggal_kedaluwarsa ? { 'Kedaluwarsa': format(new Date(eq.tanggal_kedaluwarsa), 'dd MMM yy') } : {}),
      };
    });
  };

  const exportExcel = () => {
    const data = getExportData();
    if (data.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada data untuk diexport' });
      return;
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedCategory);
    XLSX.writeFile(wb, `Data_Alat_${selectedCategory}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    toast({ title: 'Berhasil', description: 'File Excel berhasil diunduh' });
  };

  const exportPDF = () => {
    const data = getExportData();
    if (data.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada data untuk diexport' });
      return;
    }
    const doc = new jsPDF('landscape', 'mm', 'a4');
    doc.setFontSize(14);
    doc.text(`Data Alat - ${selectedCategory}`, 14, 15);
    doc.setFontSize(9);
    doc.text(`Diekspor: ${format(new Date(), 'dd MMM yy')}`, 14, 22);

    const columns = Object.keys(data[0]);
    const rows = data.map(d => columns.map(c => (d as any)[c] || '-'));

    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      didParseCell: (hookData: any) => {
        if (hookData.section === 'body') {
          const statusCol = columns.indexOf('Status');
          if (hookData.column.index === statusCol) {
            const val = hookData.cell.raw;
            if (['Belum Inspeksi', 'Terlambat', 'Expired', 'Non Aktif'].includes(val)) {
              hookData.cell.styles.textColor = [220, 38, 38];
              hookData.cell.styles.fontStyle = 'bold';
            } else if (val === 'Warning Expired') {
              hookData.cell.styles.textColor = [217, 119, 6];
              hookData.cell.styles.fontStyle = 'bold';
            }
          }
        }
      },
    });

    doc.save(`Data_Alat_${selectedCategory}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    toast({ title: 'Berhasil', description: 'File PDF berhasil diunduh' });
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground text-sm">Memuat...</div>;

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categoryNames.map(cat => (
          <button key={cat} onClick={() => { setSelectedCategory(cat); setStatusFilters([]); }}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              selectedCategory === cat ? 'gradient-accent text-accent-foreground shadow-card' : 'bg-card text-muted-foreground border border-border'
            }`}>{cat}</button>
        ))}
      </div>

      {/* Search + Filter + Add + Export */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari alat..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" />
        </div>
        <Button variant="outline" size="icon" className="rounded-xl shrink-0" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="rounded-xl shrink-0" onClick={exportExcel} title="Export Excel">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
        </Button>
        <Button variant="outline" size="icon" className="rounded-xl shrink-0" onClick={exportPDF} title="Export PDF">
          <FileText className="h-4 w-4 text-destructive" />
        </Button>
        {(!showAllUsers || user?.role === 'admin') && (
          <Button onClick={openAdd} className="gradient-accent text-accent-foreground rounded-xl shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="glass-card rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold">Filter</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Status Inspeksi (pilih beberapa)</Label>
              <div className="space-y-1">
                {[
                  { value: 'never_inspected' as StatusFilterValue, label: 'Belum Pernah Inspeksi' },
                  { value: 'overdue' as StatusFilterValue, label: 'Terlambat (Overdue)' },
                  ...(hasExpiry ? [
                    { value: 'warning_expired' as StatusFilterValue, label: 'Warning Expired' },
                    { value: 'expired' as StatusFilterValue, label: 'Expired' },
                  ] : []),
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={statusFilters.includes(opt.value)}
                      onChange={() => {
                        setStatusFilters(prev =>
                          prev.includes(opt.value)
                            ? prev.filter(v => v !== opt.value)
                            : [...prev, opt.value]
                        );
                      }}
                      className="rounded border-border"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            {showAllUsers && (
              <div className="space-y-1">
                <Label className="text-xs">K3LM</Label>
                <Select value={filterK3lm} onValueChange={setFilterK3lm}>
                  <SelectTrigger className="rounded-xl text-sm"><SelectValue placeholder="Semua K3LM" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua K3LM</SelectItem>
                    {k3lmSections.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setStatusFilters([]); setFilterK3lm(''); }}>
            Reset Filter
          </Button>
        </div>
      )}

      {/* Active filter badges */}
      {(statusFilters.length > 0 || filterK3lm) && (
        <div className="flex gap-2 flex-wrap">
          {statusFilters.map(f => (
            <span key={f} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium bg-destructive/10 text-destructive cursor-pointer"
              onClick={() => setStatusFilters(prev => prev.filter(v => v !== f))}>
              {f === 'never_inspected' && 'Belum Inspeksi'}
              {f === 'overdue' && 'Terlambat'}
              {f === 'warning_expired' && 'Warning Expired'}
              {f === 'expired' && 'Expired'}
              &nbsp;✕
            </span>
          ))}
          {filterK3lm && filterK3lm !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
              K3LM: {filterK3lm}
            </span>
          )}
        </div>
      )}

      {/* Equipment list */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{filtered.length} alat ditemukan</p>
        {filtered.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="text-muted-foreground text-sm">Belum ada data {selectedCategory}</p>
          </div>
        ) : (
          filtered.map(eq => {
            const allStatuses = getAllStatuses(eq);
            const details = getEquipmentDetails(eq);
            const hasRedStatus = allStatuses.some(s => ['Belum Inspeksi', 'Terlambat', 'Expired', 'Non Aktif'].includes(s.label));
            return (
              <div key={eq.id} className={`glass-card rounded-xl p-4 ${hasRedStatus ? 'border-2 border-destructive bg-destructive/5' : ''}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-display text-sm font-semibold">{eq.kode}</p>
                    <p className="text-xs text-muted-foreground">{eq.lokasi}</p>
                    {showAllUsers && profileMap[eq.user_id] && (
                      <p className="text-[10px] text-muted-foreground">K3LM: {profileMap[eq.user_id].section || '-'}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {allStatuses.map((s, i) => (
                      <span key={i} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ${s.className}`}>
                        {(s.label === 'Warning Expired' || ['Belum Inspeksi', 'Terlambat', 'Expired', 'Non Aktif'].includes(s.label)) && <AlertTriangle className="h-3 w-3" />}
                        {s.label}
                      </span>
                    ))}
                  </div>
                </div>
                {details.length > 0 && (
                  <div className="flex gap-3 text-xs text-muted-foreground mb-2 flex-wrap">
                    {details.map((d, i) => <span key={i}>{d}</span>)}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {eq.last_check_date ? `Cek terakhir: ${format(new Date(eq.last_check_date), 'dd MMM yy')}` : 'Belum pernah dicek'}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(eq)}>
                      <Pencil className="h-3.5 w-3.5 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(eq.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="rounded-2xl max-w-sm mx-auto max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editingId ? 'Edit' : 'Tambah'} {selectedCategory}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {categoryFields.map(renderFormField)}
            <Button onClick={handleSave} disabled={add.isPending || update.isPending} className="w-full gradient-accent text-accent-foreground font-semibold rounded-xl">
              {editingId ? 'Simpan Perubahan' : 'Tambah Alat'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data alat ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MasterData;
