import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, KeyRound, ChevronDown, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LoginProfile {
  id: string;
  name: string;
  email: string | null;
}

const ADMIN_EMAIL = 'admin@hse.digimons.local';

const InspectionLogin = () => {
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [profiles, setProfiles] = useState<LoginProfile[]>([]);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // If already logged in, go to inspection dashboard
  useEffect(() => {
    if (user) navigate('/inspection-dashboard', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, name, email')
      .order('name')
      .then(({ data }) => {
        const k3lmProfiles = (data || []).filter(p => p.email !== ADMIN_EMAIL);
        setProfiles(k3lmProfiles as LoginProfile[]);
      });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const profile = profiles.find(p => p.id === selectedProfileId);
    if (!profile || !profile.email) {
      toast({ title: 'Error', description: 'Pilih nama K3LM terlebih dahulu', variant: 'destructive' });
      return;
    }
    if (!password) {
      toast({ title: 'Error', description: 'Password wajib diisi', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const result = await login(profile.email, password);
    setIsLoading(false);
    if (result.error) {
      toast({ title: 'Login Gagal', description: result.error, variant: 'destructive' });
    } else {
      navigate('/inspection-dashboard');
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-2 text-primary-foreground">
          <Shield className="h-7 w-7 text-accent" />
          <span className="font-display text-lg font-bold">DIGIMONS</span>
          <span className="ml-2 text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">Inspeksi</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-sm">
          <div className="glass-card rounded-2xl p-6 shadow-elevated">
            <div className="text-center mb-6">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl gradient-accent shadow-elevated">
                <Lock className="h-7 w-7 text-accent-foreground" />
              </div>
              <h2 className="font-display text-xl font-bold">Login Inspeksi</h2>
              <p className="text-sm text-muted-foreground mt-1">Masuk untuk melakukan checklist inspeksi</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nama K3LM</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <select
                    value={selectedProfileId}
                    onChange={e => setSelectedProfileId(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-input bg-background pl-9 pr-8 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring appearance-none"
                  >
                    <option value="">-- Pilih K3LM --</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Masukkan password..."
                    className="rounded-xl pl-9"
                  />
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full gradient-accent text-accent-foreground font-semibold rounded-xl py-5">
                {isLoading ? 'Masuk...' : 'Masuk Inspeksi'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate('/riwayat-inspeksi')}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Riwayat Inspeksi
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspectionLogin;
