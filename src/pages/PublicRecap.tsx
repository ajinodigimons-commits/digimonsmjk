import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RecapView from '@/components/RecapView';

const PublicRecap = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="gradient-hero text-primary-foreground sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-accent" />
              <span className="font-display text-lg font-bold">DIGIMONS</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground/70 hover:text-primary-foreground gap-1.5"
              onClick={() => navigate('/login')}
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        <div className="glass-card rounded-xl p-5 mb-4">
          <h2 className="font-display text-lg font-bold mb-1">Riwayat Inspeksi</h2>
          <p className="text-sm text-muted-foreground">Rekap pengecekan alat emergency — akses publik</p>
        </div>
        <RecapView showAllUsers isPublic />
      </div>
    </div>
  );
};

export default PublicRecap;
