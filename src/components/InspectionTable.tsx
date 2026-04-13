import { useMemo } from 'react';
import { Database, CheckCircle, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCategories, useEquipments, useInspections, useProfiles, EquipmentRow, CategoryRow } from '@/hooks/useSupabaseData';

interface Props {
  userId?: string;
}

const InspectionTable = ({ userId }: Props) => {
  const { data: categories = [] } = useCategories();
  const { data: equipments = [] } = useEquipments(!userId);
  const { data: results = [] } = useInspections();
  const { data: profiles = [] } = useProfiles();

  const isAllK3lm = !userId;

  // Helper: check if equipment is inspected within its period
  const isInspected = (eq: EquipmentRow, periodMonths: number) => {
    const eqResults = results.filter(r => r.equipment_id === eq.id);
    if (eqResults.length === 0) return false;
    const latestDate = eqResults.reduce((max, r) => {
      const d = new Date(r.checked_at).getTime();
      return d > max ? d : max;
    }, 0);
    const deadline = new Date(latestDate);
    deadline.setMonth(deadline.getMonth() + periodMonths);
    return deadline.getTime() > Date.now();
  };

  // === VIEW 1: Detail per category (when specific K3LM selected) ===
  const detailRows = useMemo(() => {
    if (isAllK3lm) return [];
    const filtered = equipments.filter(e => e.user_id === userId);

    const catMap = new Map<string, EquipmentRow[]>();
    filtered.forEach(eq => {
      const list = catMap.get(eq.category) || [];
      list.push(eq);
      catMap.set(eq.category, list);
    });

    return categories
      .filter(cat => catMap.has(cat.name))
      .map(cat => {
        const eqs = catMap.get(cat.name) || [];
        let inspected = 0;
        let notInspected = 0;
        eqs.forEach(eq => {
          if (isInspected(eq, cat.period_months)) inspected++;
          else notInspected++;
        });
        return {
          category: cat.name,
          total: eqs.length,
          period: cat.period_months,
          inspected,
          notInspected,
        };
      });
  }, [categories, equipments, results, userId, isAllK3lm]);

  // === VIEW 2: Summary per K3LM (when "Semua K3LM") ===
  const summaryRows = useMemo(() => {
    if (!isAllK3lm) return [];

    const catPeriodMap = new Map<string, number>();
    categories.forEach(c => catPeriodMap.set(c.name, c.period_months));

    return profiles.map(profile => {
      const userEqs = equipments.filter(e => e.user_id === profile.id);
      let inspected = 0;
      let notInspected = 0;

      userEqs.forEach(eq => {
        const period = catPeriodMap.get(eq.category) || 3;
        if (isInspected(eq, period)) inspected++;
        else notInspected++;
      });

      const total = userEqs.length;
      const pct = total > 0 ? Math.round((inspected / total) * 100) : 0;

      return {
        profileId: profile.id,
        name: profile.name,
        section: profile.section,
        total,
        inspected,
        notInspected,
        pct,
      };
    }).filter(r => r.total > 0);
  }, [profiles, equipments, results, categories, isAllK3lm]);

  // Totals
  const totalAll = isAllK3lm
    ? summaryRows.reduce((s, r) => s + r.total, 0)
    : detailRows.reduce((s, r) => s + r.total, 0);
  const totalInspected = isAllK3lm
    ? summaryRows.reduce((s, r) => s + r.inspected, 0)
    : detailRows.reduce((s, r) => s + r.inspected, 0);
  const totalNotInspected = isAllK3lm
    ? summaryRows.reduce((s, r) => s + r.notInspected, 0)
    : detailRows.reduce((s, r) => s + r.notInspected, 0);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="glass-card rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 text-center sm:text-left">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <Database className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Data Alat</p>
            <p className="font-display text-lg sm:text-xl font-bold">{totalAll}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 text-center sm:text-left">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-safety-green/10 flex items-center justify-center shrink-0">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-safety-green" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Sudah Diinspeksi</p>
            <p className="font-display text-lg sm:text-xl font-bold text-safety-green">{totalInspected}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 text-center sm:text-left">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Belum Diinspeksi</p>
            <p className="font-display text-lg sm:text-xl font-bold text-destructive">{totalNotInspected}</p>
          </div>
        </div>
      </div>

      {/* Conditional table */}
      <div className="glass-card rounded-xl overflow-x-auto">
        {isAllK3lm ? (
          /* === TABLE: Ringkasan per K3LM === */
          <Table className="min-w-[420px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold text-xs sm:text-sm">K3LM</TableHead>
                <TableHead className="text-center font-semibold text-xs sm:text-sm">Total Alat</TableHead>
                <TableHead className="text-center font-semibold text-xs sm:text-sm whitespace-nowrap">Sudah Diinspeksi</TableHead>
                <TableHead className="text-center font-semibold text-xs sm:text-sm whitespace-nowrap">Belum Diinspeksi</TableHead>
                <TableHead className="text-center font-semibold text-xs sm:text-sm">Persentase</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Belum ada data alat
                  </TableCell>
                </TableRow>
              )}
              {summaryRows.map(row => (
                <TableRow key={row.profileId}>
                  <TableCell className="font-medium text-xs sm:text-sm">
                    <div>{row.name}</div>
                    {row.section && <div className="text-[10px] text-muted-foreground">{row.section}</div>}
                  </TableCell>
                  <TableCell className="text-center text-xs sm:text-sm">{row.total}</TableCell>
                  <TableCell className="text-center text-safety-green font-semibold text-xs sm:text-sm">{row.inspected}</TableCell>
                  <TableCell className="text-center text-destructive font-semibold text-xs sm:text-sm">{row.notInspected}</TableCell>
                  <TableCell className="text-center text-xs sm:text-sm font-semibold">
                    <span className={row.pct >= 80 ? 'text-safety-green' : row.pct >= 50 ? 'text-accent' : 'text-destructive'}>
                      {row.pct}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          /* === TABLE: Detail per kategori alat === */
          <Table className="min-w-[420px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold text-xs sm:text-sm">Alat Emergency</TableHead>
                <TableHead className="text-center font-semibold text-xs sm:text-sm">Data Alat</TableHead>
                <TableHead className="text-center font-semibold text-xs sm:text-sm">Frekuensi</TableHead>
                <TableHead className="text-center font-semibold text-xs sm:text-sm whitespace-nowrap">Sudah Diinspeksi</TableHead>
                <TableHead className="text-center font-semibold text-xs sm:text-sm whitespace-nowrap">Belum Diinspeksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detailRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Belum ada data alat
                  </TableCell>
                </TableRow>
              )}
              {detailRows.map(row => (
                <TableRow key={row.category}>
                  <TableCell className="font-medium text-xs sm:text-sm">{row.category}</TableCell>
                  <TableCell className="text-center text-xs sm:text-sm">{row.total}</TableCell>
                  <TableCell className="text-center text-xs sm:text-sm whitespace-nowrap">{row.period} Bulan</TableCell>
                  <TableCell className="text-center text-safety-green font-semibold text-xs sm:text-sm">{row.inspected}</TableCell>
                  <TableCell className="text-center text-destructive font-semibold text-xs sm:text-sm">{row.notInspected}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default InspectionTable;
