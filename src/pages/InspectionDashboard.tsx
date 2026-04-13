import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ClipboardCheck, BarChart3, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import ChecklistView from '@/components/ChecklistView';
import RecapView from '@/components/RecapView';

type Tab = 'checklist' | 'rekap';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'checklist', label: 'Checklist', icon: ClipboardCheck },
  { id: 'rekap', label: 'Riwayat', icon: BarChart3 },
];

const InspectionDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('checklist');

  const handleLogout = async () => { await logout(); navigate('/loginchecklistemergency123456'); };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="gradient-hero text-primary-foreground sticky top-0 z-40">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
              <span className="font-display text-base sm:text-lg font-bold">DIGIMONS</span>
              <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">Inspeksi</span>
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
        {activeTab === 'checklist' && <ChecklistView />}
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

export default InspectionDashboard;
