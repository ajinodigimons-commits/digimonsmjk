import { useState, useMemo, useRef, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useCategories, useEquipments, useEquipmentMutations, useChecklistItems, useInspectionMutations, ChecklistItemRow, EquipmentRow } from '@/hooks/useSupabaseData';

const AnswerInput = ({ item, value, onChange }: { item: ChecklistItemRow; value: string; onChange: (v: string) => void }) => {
  const type = item.question_type || 'multiple_choice';
  const options = (item.options as string[]) || ['Ya', 'Tidak'];

  if (type === 'multiple_choice') {
    return (
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button key={opt} onClick={() => onChange(opt)}
            className={`flex-1 min-w-[80px] flex items-center justify-center rounded-xl py-2.5 text-sm font-medium transition-all ${
              value === opt ? 'bg-accent text-accent-foreground shadow-sm' : 'bg-muted text-muted-foreground'
            }`}>{opt}</button>
        ))}
      </div>
    );
  }
  if (type === 'text') return <Input value={value} onChange={e => onChange(e.target.value)} placeholder="Ketik jawaban..." className="rounded-xl" />;
  if (type === 'number') return <Input type="text" inputMode="numeric" pattern="[0-9]*" value={value} onChange={e => { const v = e.target.value.replace(/[^0-9.,]/g, ''); onChange(v); }} placeholder="Masukkan angka..." className="rounded-xl" />;
  if (type === 'date') {
    // Store as YYYY-MM-DD string directly to avoid timezone issues
    const dateStr = value && value.includes('T') ? value.split('T')[0] : value;
    return (
      <input
        type="date"
        value={dateStr || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
      />
    );
  }
  return null;
};

const ChecklistView = ({ onSubmitSuccess }: { onSubmitSuccess?: () => Promise<void> | void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: categories = [] } = useCategories();
  const { data: equipments = [] } = useEquipments();
  const { data: checklistItems = [] } = useChecklistItems();
  const { update: updateEquipment } = useEquipmentMutations();
  const { addInspection } = useInspectionMutations();

  const categoryNames = categories.map(c => c.name);
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryNames[0] || 'APAR');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [officerName, setOfficerName] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'hsl(var(--foreground))';
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing]);

  const stopDrawing = useCallback(() => setIsDrawing(false), []);
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const filteredEquipments = useMemo(() => {
    return equipments.filter(e => e.category === selectedCategory && e.user_id === user?.id && e.status === 'Aktif');
  }, [equipments, selectedCategory, user]);

  const checklist = checklistItems.filter(c => c.category === selectedCategory);
  const selectedEq = filteredEquipments.find(e => e.id === selectedEquipment);

  const handleSubmit = async () => {
    if (!selectedEquipment) {
      toast({ title: 'Error', description: 'Pilih alat terlebih dahulu', variant: 'destructive' });
      return;
    }
    if (!officerName.trim()) {
      toast({ title: 'Error', description: 'Isi nama petugas terlebih dahulu', variant: 'destructive' });
      return;
    }

    // Validate number fields - normalize comma to dot
    const numberItems = checklist.filter(c => c.question_type === 'number');
    for (const item of numberItems) {
      const raw = answers[item.id];
      if (raw) {
        const normalized = raw.replace(/,/g, '.');
        if (isNaN(Number(normalized)) || normalized.trim() === '') {
          toast({ title: 'Error', description: `"${item.question}" harus berisi angka yang valid`, variant: 'destructive' });
          return;
        }
        answers[item.id] = normalized;
      }
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      // Update equipment last_check_date + sync kedaluwarsa
      const updateData: Partial<EquipmentRow> & { id: string } = { id: selectedEquipment, last_check_date: now };

      // Sync Tanggal Kedaluwarsa from checklist answer to master data
      // Match any date-type question containing "kedaluwarsa" (handles typos like "kedaluarsa" too)
      const expiryItem = checklist.find(c => 
        c.question_type === 'date' && 
        (c.question.toLowerCase().includes('kedaluwarsa') || c.question.toLowerCase().includes('kedaluarsa'))
      );
      if (expiryItem && answers[expiryItem.id]) {
        const dateVal = answers[expiryItem.id];
        // Use date string directly (YYYY-MM-DD) to avoid timezone shift
        const dateOnly = dateVal.includes('T') ? dateVal.split('T')[0] : dateVal;
        if (dateOnly && /^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
          updateData.tanggal_kedaluwarsa = dateOnly;
        }
      }

      await updateEquipment.mutateAsync(updateData);

      // Insert inspection header + answers in one mutation
      await addInspection.mutateAsync({
        inspection: {
          equipment_id: selectedEquipment,
          checked_at: now,
          checked_by: user?.id || '',
          officer_name: officerName.trim(),
          signature: 'approve',
        },
        answers: checklist.map(c => ({
          checklist_item_id: c.id,
          answer: answers[c.id] ?? '',
          notes: null,
        })),
      });

      toast({ title: 'Berhasil', description: 'Checklist berhasil disimpan' });
      setAnswers({});
      setSelectedEquipment('');
      setOfficerName('');
      clearSignature();
      if (onSubmitSuccess) await onSubmitSuccess();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categoryNames.map(cat => (
          <button key={cat} onClick={() => { setSelectedCategory(cat); setSelectedEquipment(''); setAnswers({}); }}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              selectedCategory === cat ? 'gradient-accent text-accent-foreground shadow-card' : 'bg-card text-muted-foreground border border-border'
            }`}>{cat}</button>
        ))}
      </div>

      <div className="relative">
        <button type="button" className="w-full flex items-center justify-between rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-left"
          onClick={() => setShowDropdown(!showDropdown)}>
          <div className="flex-1">
            {selectedEq ? (
              <div>
                <span className="text-foreground">{selectedEq.kode} — {selectedEq.lokasi}</span>
                {selectedEq.last_check_date && (
                  <div className="text-xs mt-0.5 text-muted-foreground">
                    Terakhir: {format(new Date(selectedEq.last_check_date), 'dd MMM yy')}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">Pilih alat untuk dicek...</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
        {showDropdown && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-elevated overflow-hidden max-h-48 overflow-y-auto">
            {filteredEquipments.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">Tidak ada alat aktif</p>
            ) : (
              filteredEquipments.map(eq => (
                <button key={eq.id} type="button" className="w-full px-3 py-2.5 text-sm text-left hover:bg-muted transition-colors"
                  onClick={() => { setSelectedEquipment(eq.id); setShowDropdown(false); }}>
                  <div><span className="font-medium">{eq.kode}</span><span className="text-muted-foreground ml-2">— {eq.lokasi}</span></div>
                  <div className="text-xs mt-0.5 text-muted-foreground">
                    {eq.last_check_date ? `Terakhir: ${format(new Date(eq.last_check_date), 'dd MMM yy')}` : 'Belum pernah dicek'}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {selectedEquipment && (
        <div className="space-y-2">
          {checklist.map((item, idx) => (
            <div key={item.id} className="glass-card rounded-xl p-4">
              <p className="text-sm font-medium mb-3">
                <span className="text-accent font-display mr-2">{idx + 1}.</span>{item.question}
              </p>
              <AnswerInput item={item} value={answers[item.id] ?? ''} onChange={v => setAnswers(prev => ({ ...prev, [item.id]: v }))} />
            </div>
          ))}

          <div className="glass-card rounded-xl p-4 space-y-2">
            <label className="text-sm font-medium">Nama Petugas</label>
            <input type="text" value={officerName} onChange={e => setOfficerName(e.target.value.replace(/\b\w/g, c => c.toUpperCase()))} placeholder="Masukkan nama petugas..."
              className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>

          <div className="glass-card rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Tanda Tangan Digital</label>
              <button type="button" onClick={clearSignature} className="text-xs text-accent font-medium hover:underline">Hapus</button>
            </div>
            <canvas ref={canvasRef} width={300} height={150}
              className="w-full rounded-xl border border-input bg-card touch-none cursor-crosshair"
              onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
              onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
          </div>

          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full gradient-accent text-accent-foreground font-semibold rounded-xl py-5">
            {isSubmitting ? 'Menyimpan...' : 'Simpan Checklist'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ChecklistView;
