import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="gradient-hero text-primary-foreground flex-1 flex flex-col">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-accent" />
              <span className="font-display text-xl font-bold">DIGIMONS</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-accent text-accent hover:bg-accent hover:text-accent-foreground font-semibold"
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 pb-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-4 py-1.5 text-sm font-medium text-accent mb-6">
              <Shield className="h-4 w-4" />
              Digital Monitoring System
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4 leading-tight">
              Sistem Pengecekan<br />
              <span className="text-accent">Alat Emergency</span>
            </h1>
            <p className="text-primary-foreground/70 text-lg max-w-md mx-auto mb-8">
              Monitoring dan pengecekan alat keselamatan secara digital, terstruktur, dan terjadwal.
            </p>
            <Button
              size="lg"
              className="gradient-accent text-accent-foreground font-semibold shadow-elevated px-8 text-base"
              onClick={() => navigate('/login')}
            >
              Mulai Sekarang
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">© 2026 DIGIMONS — HSE Departement</p>
      </div>
    </div>
  );
};

export default Landing;
