import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';

export function ViewerPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await api.get(`/view/${slug}`);
        setMetadata(res.data);
      } catch (e) {
        toast.error("Link invalid or expired");
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchMeta();
  }, [slug]);

  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const authPayload = {
        ...(password.trim() ? { password: password.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
      };
      const sessionPayload = {
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
      };
      const authRes = await api.post(`/view/${slug}/auth`, authPayload);
      
      const sessionRes = await api.post(`/view/${slug}/session/start`, sessionPayload);
      
      // Store session token and viewer token (simplified for MVP)
      sessionStorage.setItem(`pv_session_${slug}`, sessionRes.data.session_id);
      sessionStorage.setItem(`pv_token_${slug}`, authRes.data.viewer_token);
      
      navigate(`/present/${slug}`);
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : "Access denied");
    }
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-primary font-mono text-sm uppercase animate-pulse">Establishing Secure Connection...</div>;
  if (!metadata) return <div className="h-screen bg-black flex items-center justify-center text-destructive font-mono text-sm uppercase">Access Denied</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-black font-sans relative overflow-hidden">
        {/* Background branding visual */}
        <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
            <span className="text-[200px] font-black italic tracking-tighter text-primary/20 rotate-[-5deg]">PITCHVAULT</span>
        </div>

      <div className="w-full max-w-sm border border-primary/20 bg-card/60 backdrop-blur-xl p-8 rounded-lg shadow-[0_0_20px_rgba(1,105,111,0.2)] relative z-10">
        <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center shadow-[0_0_12px_rgba(1,105,111,0.4)]">
                <Shield className="w-6 h-6 text-black" />
            </div>
        </div>
        
        <div className="text-center mb-8">
           <h1 className="text-xl font-bold text-white leading-tight">{metadata.title}</h1>
           <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mt-2">Secure Payload Delivery</p>
        </div>

        <form onSubmit={handleAccess} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase font-mono tracking-widest text-muted-foreground">Gatekeeper Key</label>
            {metadata.access_type === 'password' ? (
                <Input 
                type="password" 
                placeholder="Access Password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                className="bg-card/40 border-border font-mono text-sm h-10 text-center tracking-[0.2em]"
                />
            ) : (
                 <div className="p-3 border border-dashed border-primary/30 text-center font-mono text-xs text-primary/70 uppercase">
                    Public Gateway Enabled
                 </div>
            )}
          </div>
          
          <Button type="submit" className="w-full bg-primary text-black font-bold uppercase tracking-widest text-xs h-10 mt-6 shadow-[0_0_15px_rgba(1,105,111,0.5)]">
            Initialize View
          </Button>
        </form>
      </div>
    </div>
  );
}
