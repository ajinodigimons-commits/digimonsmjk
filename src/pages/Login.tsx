import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, KeyRound, ChevronDown, ClipboardList } from 'lucide-react';
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

const ADMIN_USERNAME = 'Admin HSE';
const ADMIN_EMAIL = 'admin@hse.digimons.local';

const Login = () => {
  const [loginMode, setLoginMode] = useState<'user' | 'admin'>('user');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [profiles, setProfiles] = useState<LoginProfile[]>([]);
  const [password, setPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Fetch K3LM profiles for dropdown (anon can read)
    supabase
      .from('profiles')
      .select('id, name, email')
      .order('name')
      .then(({ data }) => {
        // Filter out admin profile
        const k3lmProfiles = (data || []).filter(p => p.email !== ADMIN_EMAIL);
        setProfiles(k3lmProfiles as LoginProfile[]);
      });
  }, []);

  const handleUserLogin = async (e: React.FormEvent) => {
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
      navigate('/dashboard');
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) {
      toast({ title: 'Error', description: 'Password wajib diisi', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const result = await login(ADMIN_EMAIL, adminPassword);
    setIsLoading(false);
    if (result.error) {
      toast({ title: 'Login Gagal', description: result.error, variant: 'destructive' });
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-2 text-primary-foreground">
          <Shield className="h-7 w-7 text-accent" />
          <span className="font-display text-lg font-bold">DIGIMONS</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-sm">
          <div className="glass-card rounded-2xl p-6 shadow-elevated">
            <div className="text-center mb-6">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl gradient-accent shadow-elevated">
                <Lock className="h-7 w-7 text-accent-foreground" />
              </div>
              <h2 className="font-display text-xl font-bold">Login</h2>
              <p className="text-sm text-muted-foreground mt-1">Masuk ke sistem DIGIMONS</p>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-5">
              <button
                type="button"
                onClick={() => setLoginMode('user')}
                className={`flex-1 text-sm font-medium py-2 rounded-xl transition-all ${
                  loginMode === 'user'
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                K3LM / User
              </button>
              <button
                type="button"
                onClick={() => setLoginMode('admin')}
                className={`flex-1 text-sm font-medium py-2 rounded-xl transition-all ${
                  loginMode === 'admin'
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                Admin HSE
              </button>
            </div>

            {loginMode === 'user' ? (
              <form onSubmit={handleUserLogin} className="space-y-4">
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
                  {isLoading ? 'Masuk...' : 'Masuk'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      value={ADMIN_USERNAME}
                      disabled
                      className="rounded-xl pl-9 bg-muted"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      placeholder="Masukkan password admin..."
                      className="rounded-xl pl-9"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full gradient-accent text-accent-foreground font-semibold rounded-xl py-5">
                  {isLoading ? 'Masuk...' : 'Masuk sebagai Admin'}
                </Button>
              </form>
            )}
          </div>

          {/* Public Riwayat Inspeksi button */}
          <button
            type="button"
            onClick={() => navigate('/riwayat-inspeksi')}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-card/80 py-3 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-accent hover:text-accent-foreground"
          >
            <ClipboardList className="h-5 w-5" />
            Riwayat Inspeksi
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
