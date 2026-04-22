import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2 } from 'lucide-react';

export function PresentationPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: any;
    const loadContent = async () => {
      try {
        const token = sessionStorage.getItem(`pv_token_${slug}`);
        if (!token) throw new Error("No token");

        const res = await api.get(`/view/${slug}/content?token=${token}`);
        setHtmlContent(res.data.html_content);
        
        // Start heartbeat
        const sessionId = sessionStorage.getItem(`pv_session_${slug}`);
        if(sessionId) {
            interval = setInterval(() => {
                // Ignore errors on heartbeat
                api.post(`/view/${slug}/session/heartbeat`, { session_id: sessionId }).catch(() => {});
            }, 15000);
        }
      } catch (e) {
        toast.error("Failed to load presentation");
        navigate(`/v/${slug}`);
      } finally {
        setLoading(false);
      }
    };
    
    if (slug) loadContent();
    
    return () => {
        if(interval) clearInterval(interval);
    }
  }, [slug, navigate]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) navigate('/'); // or where appropriate
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [navigate]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        toast.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (loading) return <div className="h-screen bg-black flex items-center justify-center">Loading...</div>;

  return (
    <div ref={containerRef} className="fixed inset-0 z-[100] bg-white h-screen w-screen overflow-hidden">
      <div className="fixed top-8 right-8 z-[110] flex gap-2 transition-opacity duration-300">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={toggleFullscreen} 
          className="bg-black/10 border-black/20 text-black hover:bg-black/20"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </Button>
        <Button onClick={() => navigate(-1)} className="bg-black text-white hover:bg-black/90 font-bold uppercase tracking-widest text-[10px]">Close Session</Button>
      </div>
      <iframe 
        className="w-full h-full border-none pointer-events-auto"
        sandbox="allow-scripts allow-same-origin"
        srcDoc={`
          <!DOCTYPE html>
          <html>
              <head>
                <style>
                  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700;900&display=swap');
                  body { font-family: 'Inter', sans-serif; color: #000; line-height: 1.5; padding: 60px; margin: 0; background: #fff; min-height: 100vh; }
                  h1 { font-size: 8vw; line-height: 0.85; margin: 0 0 60px 0; font-weight: 900; letter-spacing: -0.04em; text-transform: uppercase; }
                  p { font-size: 2.2rem; font-weight: 300; margin-bottom: 40px; }
                </style>
              </head>
              <body>${htmlContent}</body>
          </html>
        `}
      />
    </div>
  );
}
