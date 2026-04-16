import { useState, useMemo } from 'react';
import { Filter, FileSpreadsheet, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories, useEquipments, useChecklistItems, useInspections, useInspectionAnswers, useSchedules, useProfiles } from '@/hooks/useSupabaseData';
import { format, addMonths, isBefore, subDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface RecapRow {
  equipmentId: string;
  kode: string;
  lokasi: string;
  category: string;
  k3lm: string;
  userId: string;
  officerName: string;
  checkedAt: string;
  answers: Record<string, string>;
  isOverdue: boolean;
  tanggalKedaluwarsa: string | null;
}

const getExpiryStatus = (dateStr: string | null): 'normal' | 'warning' | 'expired' => {
  if (!dateStr) return 'normal';
  const expiry = new Date(dateStr);
  const now = new Date();
  if (isBefore(expiry, now)) return 'expired';
  if (isBefore(expiry, addMonths(now, 0)) || isBefore(subDays(expiry, 30), now)) return 'warning';
  return 'normal';
};

const expiryColorClass = (status: 'normal' | 'warning' | 'expired') => {
  if (status === 'expired') return 'text-destructive bg-destructive/10';
  if (status === 'warning') return 'text-orange-600 bg-orange-500/10';
  return '';
};

const RecapView = ({ showAllUsers = false, isPublic = false }: { showAllUsers?: boolean; isPublic?: boolean }) => {
  const { user } = useAuth();
  const { data: categories = [] } = useCategories();
  const { data: equipments = [] } = useEquipments(true); // always fetch all, filter in JS
  const { data: checklistItems = [] } = useChecklistItems();
  const { data: inspections = [] } = useInspections();
  const inspectionIds = useMemo(() => inspections.map(i => i.id), [inspections]);
  const { data: answers = [] } = useInspectionAnswers(inspectionIds);
  const { data: schedules = [] } = useSchedules();
  const { data: profiles = [] } = useProfiles();

  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterK3lm, setFilterK3lm] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterOfficer, setFilterOfficer] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterKode, setFilterKode] = useState('');

  const categoryNames = categories.map(c => c.name);

  // Unique K3LM/sections from profiles
  const k3lmSections = useMemo(() => {
    return [...new Set(profiles.map(p => p.section).filter(Boolean))] as string[];
  }, [profiles]);

  const recapData = useMemo(() => {
    // Build answers lookup: inspection_id -> { checklist_item_id: answer }
    const answersMap: Record<string, Record<string, string>> = {};
    answers.forEach(a => {
      if (!answersMap[a.inspection_id]) answersMap[a.inspection_id] = {};
      answersMap[a.inspection_id][a.checklist_item_id] = a.answer;
    });

    const rows: RecapRow[] = [];
    inspections.forEach(ins => {
      const eq = equipments.find(e => e.id === ins.equipment_id);
      if (!eq) return;

      // For user view: filter to only logged-in user's equipment
      if (!showAllUsers && !isPublic && user && eq.user_id !== user.id) return;

      const profile = profiles.find(p => p.id === eq.user_id);
      const catObj = categories.find(c => c.name === eq.category);
      const period = catObj?.period_months ?? 3;

      const checkedDate = new Date(ins.checked_at);
      const nextDueDate = addMonths(checkedDate, period);
      const isOverdue = isBefore(nextDueDate, new Date());

      rows.push({
        equipmentId: eq.id,
        kode: eq.kode,
        lokasi: eq.lokasi,
        category: eq.category,
        k3lm: profile?.section || '-',
        userId: eq.user_id,
        officerName: ins.officer_name || '-',
        checkedAt: ins.checked_at,
        answers: answersMap[ins.id] || {},
        isOverdue,
        tanggalKedaluwarsa: eq.tanggal_kedaluwarsa || null,
      });
    });

    rows.sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime());

    // When date filters are active, show ALL inspections in range
    if (filterDateFrom || filterDateTo) {
      return rows;
    }
    // Otherwise, show only the latest inspection per equipment (default)
    const seen = new Set<string>();
    return rows.filter(r => {
      if (seen.has(r.equipmentId)) return false;
      seen.add(r.equipmentId);
      return true;
    });
  }, [equipments, inspections, answers, schedules, profiles, categories, filterDateFrom, filterDateTo, filterOfficer, filterLocation, filterKode, filterCategory, filterK3lm, showAllUsers, isPublic, user]);

  const filteredData = useMemo(() => {
    return recapData.filter(row => {
      if (filterCategory && row.category !== filterCategory) return false;
      if (filterK3lm && row.k3lm !== filterK3lm) return false;
      if (filterKode && !row.kode.toLowerCase().includes(filterKode.toLowerCase())) return false;
      if (filterLocation && !row.lokasi.toLowerCase().includes(filterLocation.toLowerCase())) return false;
      if (filterOfficer && !row.officerName.toLowerCase().includes(filterOfficer.toLowerCase())) return false;
      if (filterDateFrom && new Date(row.checkedAt) < new Date(filterDateFrom)) return false;
      if (filterDateTo) {
        const to = new Date(filterDateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(row.checkedAt) > to) return false;
      }
      return true;
    });
  }, [recapData, filterCategory, filterK3lm, filterKode, filterLocation, filterOfficer, filterDateFrom, filterDateTo]);

  const overdueCount = filteredData.filter(r => r.isOverdue).length;

  const activeCategories = [...new Set(filteredData.map(r => r.category))];
  const checklistColumns = useMemo(() => {
    const cat = filterCategory || (activeCategories.length === 1 ? activeCategories[0] : '');
    if (!cat) return [];
    return checklistItems.filter(c => c.category === cat).sort((a, b) => a.sort_order - b.sort_order);
  }, [filterCategory, activeCategories, checklistItems]);

  const formatAnswer = (answer: string | undefined): string => {
    if (!answer) return '-';
    if (answer === 'Ya') return '✓';
    if (answer === 'Tidak') return '✗';
    // Format date answers (ISO date strings like "2026-04-23" or "2026-04-23T...")
    if (/^\d{4}-\d{2}-\d{2}/.test(answer)) {
      try {
        return format(new Date(answer), 'dd MMM yy');
      } catch { /* fall through */ }
    }
    return answer.length > 10 ? answer.substring(0, 10) + '…' : answer;
  };

  const formatAnswerExport = (answer: string | undefined): string => {
    if (!answer) return '-';
    if (answer === 'Ya') return 'V';
    if (answer === 'Tidak') return 'X';
    if (/^\d{4}-\d{2}-\d{2}/.test(answer)) {
      try {
        return format(new Date(answer), 'dd MMM yy');
      } catch { /* fall through */ }
    }
    return answer;
  };

  const getExportHeaders = (): string[] => {
    const base = ['No', 'ID Alat', 'Lokasi', 'Kategori', 'K3LM/Section', 'Petugas'];
    checklistColumns.forEach((_, i) => base.push(`Q${i + 1}`));
    base.push('Tanggal Cek');
    return base;
  };

  const getExportRow = (row: RecapRow, idx: number): string[] => {
    const base = [(idx + 1).toString(), row.kode, row.lokasi, row.category, row.k3lm, row.officerName];
    checklistColumns.forEach(c => base.push(formatAnswerExport(row.answers[c.id])));
    base.push(format(new Date(row.checkedAt), 'dd MMM yy', { locale: idLocale }));
    return base;
  };

  const exportExcel = () => {
    const headers = getExportHeaders();
    const data = filteredData.map((r, i) => getExportRow(r, i));
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    ws['!cols'] = headers.map((h, i) => ({ wch: i === 0 ? 5 : Math.max(h.length, 12) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Pengecekan');
    XLSX.writeFile(wb, `Rekap_Pengecekan_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- HEADER: Logo image top-left ---
    const logoImg = new Image();
    logoImg.src = '/images/Kop_Surat_Ajinomoto.png';

    const generatePdfContent = () => {
      // Add logo at top-left
      try {
        doc.addImage(logoImg, 'PNG', 14, 8, 80, 20);
      } catch {
        // fallback text if image fails
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('PT AJINOMOTO INDONESIA', 14, 15);
        doc.text('PT AJINEX INTERNATIONAL', 14, 22);
        doc.text('MOJOKERTO FACTORY', 14, 29);
      }

      doc.setLineWidth(0.5);
      doc.line(14, 32, pageWidth - 14, 32);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('REKAP PENGECEKAN ALAT EMERGENCY', pageWidth / 2, 39, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tanggal cetak: ${format(new Date(), 'dd MMMM yyyy', { locale: idLocale })}`, pageWidth / 2, 45, { align: 'center' });

      const headers = getExportHeaders();
      const data = filteredData.map((r, i) => getExportRow(r, i));
      let startY = 49;

      if (checklistColumns.length > 0) {
        doc.setFontSize(7);
        let ly = 49;
        checklistColumns.forEach((c, i) => { doc.text(`Q${i + 1}: ${c.question}`, 14, ly); ly += 3.5; });
        startY = ly + 2;
      }

      autoTable(doc, {
        startY,
        head: [headers],
        body: data,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [41, 65, 122], textColor: 255, fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: [245, 245, 250] },
        margin: { left: 14, right: 14 },
        didParseCell: (hookData) => {
          if (hookData.section === 'body') {
            const rowIdx = hookData.row.index;
            const lastColIdx = hookData.row.cells.length ? Object.keys(hookData.row.cells).length - 1 : -1;
            // Color the last column (Tanggal Cek) based on overdue status
            if (hookData.column.index === lastColIdx) {
              if (filteredData[rowIdx]?.isOverdue) {
                hookData.cell.styles.textColor = [220, 38, 38]; // red
              } else {
                hookData.cell.styles.textColor = [22, 163, 74]; // green
              }
              hookData.cell.styles.fontStyle = 'bold';
            }
          }
        },
      });

      // --- FOOTER: Signature fields ---
      const finalY = (doc as any).lastAutoTable?.finalY || (startY + 30);
      const sigY = Math.min(finalY + 15, pageHeight - 40);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      // Left signature: Ketua K3LM
      const sigLeftX = 50;
      doc.text('Mengetahui,', sigLeftX, sigY, { align: 'center' });
      doc.text('Ketua K3LM', sigLeftX, sigY + 5, { align: 'center' });
      doc.line(sigLeftX - 25, sigY + 25, sigLeftX + 25, sigY + 25);
      doc.text('(..............................)', sigLeftX, sigY + 30, { align: 'center' });

      // Right signature: Safety Representative
      const sigRightX = pageWidth - 50;
      doc.text('Mengetahui,', sigRightX, sigY, { align: 'center' });
      doc.text('Safety Representative', sigRightX, sigY + 5, { align: 'center' });
      doc.line(sigRightX - 25, sigY + 25, sigRightX + 25, sigY + 25);
      doc.text('(..............................)', sigRightX, sigY + 30, { align: 'center' });

      doc.save(`Rekap_Pengecekan_${format(new Date(), 'yyyyMMdd')}.pdf`);
    };

    // Load image first, then generate
    logoImg.onload = generatePdfContent;
    logoImg.onerror = generatePdfContent;
  };

  const clearFilters = () => {
    setFilterDateFrom(''); setFilterDateTo(''); setFilterOfficer(''); setFilterLocation(''); setFilterKode(''); setFilterCategory(''); setFilterK3lm('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="glass-card rounded-xl p-4 flex-1 mr-2">
          <h3 className="font-display text-sm font-semibold mb-1">Rekap Pengecekan</h3>
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">{filteredData.length} data inspeksi</p>
            {overdueCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-destructive/10 text-destructive rounded-full px-2 py-0.5">
                <AlertTriangle className="h-3 w-3" />
                {overdueCount} terlambat
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="icon" className="rounded-xl h-10 w-10" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-xl h-10 w-10" onClick={exportExcel} title="Export Excel">
            <FileSpreadsheet className="h-4 w-4 text-safety-green" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-xl h-10 w-10" onClick={exportPDF} title="Export PDF">
            <FileText className="h-4 w-4 text-safety-red" />
          </Button>
        </div>
      </div>

      {/* Category filter: dropdown for admin/public, pills for user */}
      {(showAllUsers || isPublic) ? (
        <div className="glass-card rounded-xl p-3">
          <Label className="text-xs font-medium mb-1 block">Filter Alat Emergency</Label>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
          >
            <option value="">Semua Alat</option>
            {categoryNames.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterCategory('')}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              !filterCategory ? 'bg-accent text-accent-foreground shadow-sm' : 'bg-muted text-muted-foreground border border-border'
            }`}
          >
            Semua
          </button>
          {categoryNames.map(c => (
            <button
              key={c}
              onClick={() => setFilterCategory(filterCategory === c ? '' : c)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filterCategory === c ? 'bg-accent text-accent-foreground shadow-sm' : 'bg-muted text-muted-foreground border border-border'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* K3LM dropdown filter — shown for admin & public views */}
      {(showAllUsers || isPublic) && (
        <div className="glass-card rounded-xl p-3">
          <Label className="text-xs font-medium mb-1 block">Filter K3LM / Section</Label>
          <select
            value={filterK3lm}
            onChange={e => setFilterK3lm(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
          >
            <option value="">Semua K3LM</option>
            {k3lmSections.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {showFilters && (
        <div className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold font-display">Filter Lanjutan</span>
            <button className="text-xs text-accent font-medium hover:underline" onClick={clearFilters}>Reset</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Dari Tanggal</Label>
              <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="rounded-xl text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sampai Tanggal</Label>
              <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="rounded-xl text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">ID Alat</Label>
              <Input value={filterKode} onChange={e => setFilterKode(e.target.value)} placeholder="Cari ID..." className="rounded-xl text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Lokasi</Label>
              <Input value={filterLocation} onChange={e => setFilterLocation(e.target.value)} placeholder="Cari lokasi..." className="rounded-xl text-xs" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nama Petugas</Label>
            <Input value={filterOfficer} onChange={e => setFilterOfficer(e.target.value)} placeholder="Cari petugas..." className="rounded-xl text-xs" />
          </div>
        </div>
      )}

      {filteredData.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-muted-foreground text-sm">Belum ada data pengecekan</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">No</th>
                  <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">ID Alat</th>
                  <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Lokasi</th>
                  <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Kategori</th>
                  {(showAllUsers || isPublic) && (
                    <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">K3LM</th>
                  )}
                  <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Petugas</th>
                  {checklistColumns.map((c, i) => (
                    <th key={c.id} className="px-2 py-2.5 text-center font-semibold whitespace-nowrap" title={c.question}>Q{i + 1}</th>
                  ))}
                  <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Tgl Cek</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, idx) => (
                  <tr
                    key={`${row.equipmentId}-${row.checkedAt}`}
                    className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                      row.isOverdue ? 'bg-destructive/5' : ''
                    }`}
                  >
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">
                      {row.kode}
                      {(() => {
                        const hasExpired = getExpiryStatus(row.tanggalKedaluwarsa) === 'expired';
                        const hasTidak = Object.values(row.answers).some(a => a === 'Tidak');
                        return (hasExpired || hasTidak) ? (
                          <span className="ml-1.5 inline-flex items-center text-[9px] font-medium text-destructive bg-destructive/10 rounded px-1 py-0.5 leading-none">
                            perlu ditindaklanjuti
                          </span>
                        ) : null;
                      })()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.lokasi}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.category}</td>
                    {(showAllUsers || isPublic) && (
                      <td className="px-3 py-2 whitespace-nowrap">{row.k3lm}</td>
                    )}
                    <td className="px-3 py-2 whitespace-nowrap">{row.officerName}</td>
                    {checklistColumns.map(c => {
                      const answer = row.answers[c.id];
                      const display = formatAnswer(answer);
                      const isDateExpiry = c.question_type === 'date' && (c.question.toLowerCase().includes('kedaluwarsa') || c.question.toLowerCase().includes('kedaluarsa'));
                      
                      if (isDateExpiry) {
                        const status = getExpiryStatus(row.tanggalKedaluwarsa);
                        return (
                          <td key={c.id} className={`px-2 py-2 text-center font-semibold whitespace-nowrap ${expiryColorClass(status)}`}>
                            {row.tanggalKedaluwarsa ? format(new Date(row.tanggalKedaluwarsa), 'dd MMM yy') : display}
                          </td>
                        );
                      }
                      
                      return (
                        <td key={c.id} className={`px-2 py-2 text-center font-semibold ${
                          display === '✓' ? 'text-safety-green' : display === '✗' ? 'text-safety-red' : ''
                        }`}>{display}</td>
                      );
                    })}
                    <td className={`px-3 py-2 whitespace-nowrap font-semibold ${
                      row.isOverdue ? 'text-destructive' : 'text-safety-green'
                    }`}>
                      {format(new Date(row.checkedAt), 'dd MMM yy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {checklistColumns.length > 0 && (
            <div className="border-t border-border px-3 py-2 bg-muted/30">
              <p className="text-[10px] text-muted-foreground font-medium mb-1">Keterangan:</p>
              <div className="space-y-0.5">
                {checklistColumns.map((c, i) => (
                  <p key={c.id} className="text-[10px] text-muted-foreground">
                    <span className="font-semibold">Q{i + 1}</span>: {c.question}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecapView;
