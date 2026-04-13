import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories, useSchedules, useScheduleMutations } from '@/hooks/useSupabaseData';

const addMonthsFn = (date: Date, months: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const ScheduleView = () => {
  const { user } = useAuth();
  const { data: categories = [] } = useCategories();
  const { data: schedules = [], isLoading } = useSchedules();
  const { upsert } = useScheduleMutations();

  const updateStartDate = async (category: string, date: string) => {
    if (!date || !user) return;
    await upsert.mutateAsync({ category, start_date: date, user_id: user.id });
  };

  const getNextDates = (startDate: string, periodMonths: number, count = 6): Date[] => {
    const dates: Date[] = [];
    let current = new Date(startDate);
    for (let i = 0; i < count; i++) {
      dates.push(new Date(current));
      current = addMonthsFn(current, periodMonths);
    }
    return dates;
  };

  const isUpcoming = (date: Date) => {
    const diff = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  };

  const isPast = (date: Date) => date < new Date();

  if (isLoading) return <div className="text-center py-8 text-muted-foreground text-sm">Memuat...</div>;

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-4">
        <h3 className="font-display text-sm font-semibold mb-1">Jadwal Pengecekan</h3>
        <p className="text-xs text-muted-foreground">Pilih tanggal awal untuk generate jadwal otomatis</p>
      </div>

      {categories.map(cat => {
        const schedule = schedules.find(s => s.category === cat.name);
        const nextDates = schedule ? getNextDates(schedule.start_date, cat.period_months) : [];

        return (
          <div key={cat.id} className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-accent" />
                <span className="font-display text-sm font-semibold">{cat.name}</span>
              </div>
              <span className="text-xs text-muted-foreground bg-muted rounded-lg px-2 py-1">
                {cat.period_months} bulan sekali
              </span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tanggal Awal</Label>
              <Input
                type="date"
                value={schedule?.start_date || ''}
                onChange={e => updateStartDate(cat.name, e.target.value)}
                className="rounded-xl text-sm"
              />
            </div>

            {nextDates.length > 0 && (
              <div className="space-y-1.5">
                {nextDates.map((d, i) => (
                  <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                    isPast(d) ? 'bg-muted text-muted-foreground line-through'
                    : isUpcoming(d) ? 'bg-safety-amber/10 text-safety-amber'
                    : 'bg-safety-blue/5 text-safety-blue'
                  }`}>
                    <ChevronRight className="h-3 w-3" />
                    <span>{format(d, 'dd MMM yy')}</span>
                    {i === 0 && <span className="ml-auto text-[10px] bg-accent/10 text-accent rounded px-1.5 py-0.5">Pertama</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ScheduleView;
