import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Database, Users, ClipboardCheck, Settings, LogOut, Layers, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import MasterData from '@/components/MasterData';
import ChecklistMaster from '@/components/ChecklistMaster';
import K3LMMaster from '@/components/K3LMMaster';
import CategoryMaster from '@/components/CategoryMaster';
import RecapView from '@/components/RecapView';
import EquipmentFieldsMaster from '@/components/EquipmentFieldsMaster';
import InspectionTable from '@/components/InspectionTable';
import { useProfiles } from '@/hooks/useSupabaseData';
import { FileQuestion } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Tab = 'overview' | 'category' | 'master' | 'k3lm' | 'fields' | 'checklist' | 'rekap';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: Settings },
  { id: 'category', label: 'Kategori', icon: Layers },
  { id: 'master', label: 'Data Alat', icon: Database },
  { id: 'fields', label: 'Pertanyaan', icon: FileQuestion },
  { id: 'k3lm', label: 'K3LM', icon: Users },
  { id: 'checklist', label: 'Checklist', icon: ClipboardCheck },
  { id: 'rekap', label: 'Rekap', icon: BarChart3 },
];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedK3lm, setSelectedK3lm] = useState<string>('all');

  const { data: allProfiles = [] } = useProfiles();

  const handleLogout = async () => { await logout(); navigate('/'); };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="gradient-hero text-primary-foreground sticky top-0 z-40">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
              <span className="font-display text-base sm:text-lg font-bold">DIGIMONS</span>
              <span className="text-[10px] sm:text-xs bg-accent/20 text-accent rounded-lg px-1.5 sm:px-2 py-0.5 font-medium">Admin</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground/70 hover:text-primary-foreground" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {activeTab === 'overview' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="glass-card rounded-xl p-4 sm:p-5">
              <h2 className="font-display text-base sm:text-lg font-bold mb-1">Dashboard Admin</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Kelola seluruh data alat emergency</p>
            </div>
            <div className="glass-card rounded-xl p-3 sm:p-4">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Filter K3LM</label>
              <Select value={selectedK3lm} onValueChange={setSelectedK3lm}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Semua K3LM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua K3LM</SelectItem>
                  {allProfiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {p.section || '-'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <InspectionTable userId={selectedK3lm === 'all' ? undefined : selectedK3lm} />
          </div>
        )}
        {activeTab === 'category' && <CategoryMaster />}
        {activeTab === 'master' && <MasterData showAllUsers />}
        {activeTab === 'fields' && <EquipmentFieldsMaster />}
        {activeTab === 'k3lm' && <K3LMMaster />}
        {activeTab === 'checklist' && <ChecklistMaster />}
        {activeTab === 'rekap' && <RecapView showAllUsers />}
      </div>

      {/* Bottom nav - optimized for 7 tabs on mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
        <div className="flex justify-around items-center py-1.5 sm:py-2 px-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 min-w-0 px-1 sm:px-3 py-1 rounded-xl transition-all ${
                activeTab === tab.id ? 'text-accent' : 'text-muted-foreground'
              }`}>
              <tab.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-[9px] sm:text-[10px] font-medium truncate max-w-[48px] sm:max-w-none">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
