import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';

export function AuthPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordLoginDisabled, setPasswordLoginDisabled] = useState(
    import.meta.env.VITE_DISABLE_PASSWORD_LOGIN === 'true'
  );

  React.useEffect(() => {
    api.get('/admin/settings/public')
      .then((res) => setPasswordLoginDisabled(Boolean(res.data.password_auth_disabled)))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (e: any) {
       toast.error(e.response?.data?.detail || "Authentication error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black font-sans relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
            <span className="text-[200px] font-black italic tracking-tighter text-primary/20 rotate-[-5deg]">SECURE</span>
        </div>
      <div className="w-full max-w-sm border border-primary/20 bg-card/60 backdrop-blur-xl p-8 rounded-lg shadow-[0_0_20px_rgba(1,105,111,0.2)] relative z-10">
        <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center shadow-[0_0_12px_rgba(1,105,111,0.4)]">
                <Shield className="w-6 h-6 text-black" />
            </div>
            <div className="flex flex-col">
                <span className="font-bold tracking-tight text-white text-2xl leading-none uppercase">PITCH<span className="text-primary italic">VAULT</span></span>
            </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!passwordLoginDisabled && (
            <>
              <div className="space-y-2">
                <label className="text-xs uppercase font-mono tracking-widest text-muted-foreground">Email Config</label>
                <Input 
                  type="email" 
                  placeholder="operator@cyderes.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  className="bg-card/40 border-border font-mono text-sm h-10 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase font-mono tracking-widest text-muted-foreground">Master Password</label>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  className="bg-card/40 border-border font-mono text-sm h-10 text-white"
                />
              </div>
              
              <Button 
                disabled={loading} 
                type="submit" 
                className="w-full bg-primary text-black font-bold uppercase tracking-widest text-xs h-10 mt-6 shadow-[0_0_15px_rgba(1,105,111,0.5)]"
              >
                {loading ? 'Processing...' : 'Authenticate Session'}
              </Button>
            </>
          )}

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase font-mono">
              <span className="bg-card/60 px-2 text-muted-foreground">or access via</span>
            </div>
          </div>

          <Button 
            type="button" 
            onClick={() => { window.location.href = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api') + '/auth/entra/login'; }}
            className="w-full bg-white text-black hover:bg-gray-200 font-bold tracking-widest text-xs h-10 gap-3"
          >
            <svg className="w-4 h-4" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
            Microsoft Entra ID
          </Button>
        </form>
      </div>
    </div>
  );
}
