import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Database, CalendarDays, BookOpen, LogOut, BarChart3, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import MasterData from '@/components/MasterData';

import ScheduleView from '@/components/ScheduleView';
import RecapView from '@/components/RecapView';
import InspectionTable from '@/components/InspectionTable';
import ChecklistView from '@/components/ChecklistView';
import { useToast } from '@/hooks/use-toast';

type Tab = 'beranda' | 'master' | 'jadwal' | 'rekap' | 'checklist';

const BASE_TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'beranda', label: 'Beranda', icon: BookOpen },
  { id: 'master', label: 'Data Alat', icon: Database },
  { id: 'jadwal', label: 'Jadwal', icon: CalendarDays },
  { id: 'rekap', label: 'Rekap', icon: BarChart3 },
];

const UserDashboard = () => {
  const { user, logout, isUser2 } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('beranda');

  const TABS = useMemo(() => {
    if (isUser2) {
      return [
        ...BASE_TABS.slice(0, 2),
        { id: 'checklist' as Tab, label: 'Checklist', icon: ClipboardCheck },
        ...BASE_TABS.slice(2),
      ];
    }
    return BASE_TABS;
  }, [isUser2]);

  const handleLogout = async () => { await logout(); navigate('/'); };

  const handleChecklistSubmit = async () => {
    // user2: tidak auto logout, kembali ke beranda
    toast({ title: 'Berhasil', description: 'Inspeksi tersimpan' });
    setActiveTab('beranda');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="gradient-hero text-primary-foreground sticky top-0 z-40">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
              <span className="font-display text-base sm:text-lg font-bold">DIGIMONS</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-[10px] sm:text-xs text-primary-foreground/70 truncate max-w-[100px] sm:max-w-none">{user?.name}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground/70 hover:text-primary-foreground" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {activeTab === 'beranda' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="glass-card rounded-xl p-4 sm:p-5">
              <h2 className="font-display text-base sm:text-lg font-bold mb-1">Selamat Datang, {user?.name}!</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Seksi: {user?.section}</p>
            </div>
            <InspectionTable userId={user?.id} />
          </div>
        )}
        {activeTab === 'master' && <MasterData />}
        {activeTab === 'checklist' && isUser2 && <ChecklistView onSubmitSuccess={handleChecklistSubmit} />}
        {activeTab === 'jadwal' && <ScheduleView />}
        {activeTab === 'rekap' && <RecapView />}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
        <div className="flex justify-around items-center py-1.5 sm:py-2 px-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 min-w-0 px-2 sm:px-3 py-1 rounded-xl transition-all ${
                activeTab === tab.id ? 'text-accent' : 'text-muted-foreground'
              }`}>
              <tab.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
