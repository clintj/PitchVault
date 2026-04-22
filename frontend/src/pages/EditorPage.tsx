import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Play, Zap, Share2, Code2, Type } from 'lucide-react';
import { Editor as MonacoEditor } from '@monaco-editor/react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { VisualEditor } from '../components/editor/VisualEditor';

export function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<any>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<'code' | 'visual'>('code');
  const [loading, setLoading] = useState(true);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareConfig, setShareConfig] = useState<any>({ access_type: "public" });

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const res = await api.get(`/documents/${id}`);
        setDoc(res.data);
        setContent(res.data.html_content || '');
        setTitle(res.data.title || '');
      } catch (e) {
        toast.error("Failed to load document");
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [id, navigate]);

  const handleSave = async () => {
    try {
      await api.put(`/documents/${id}`, { title, html_content: content });
      toast.success("Document updated successfully");
    } catch (e) {
      toast.error("Failed to save document");
    }
  };

  const createPublicShareSession = async () => {
    const shareRes = await api.post(`/shares/`, {
      document_id: id,
      access_type: "public"
    });
    const slug = shareRes.data.slug;
    const authRes = await api.post(`/view/${slug}/auth`, {});
    const sessionRes = await api.post(`/view/${slug}/session/start`, {});
    sessionStorage.setItem(`pv_session_${slug}`, sessionRes.data.session_id);
    sessionStorage.setItem(`pv_token_${slug}`, authRes.data.viewer_token);
    return slug;
  };

  const handlePresent = async () => {
    try {
      const slug = await createPublicShareSession();
      navigate(`/present/${slug}`);
    } catch (e) {
      toast.error("Failed to start presentation");
    }
  };

  const handleCreateShare = async () => {
    try {
      const res = await api.post(`/shares/`, { 
        document_id: id, 
        access_type: shareConfig.access_type 
      });
      const shareUrl = `${window.location.origin}/v/${res.data.slug}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link created and copied to clipboard!");
      setIsShareOpen(false);
    } catch (e) {
      toast.error("Failed to create share link");
    }
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center font-mono text-primary uppercase">Loading...</div>;

  return (
    <div className="flex flex-col h-screen bg-black text-foreground overflow-hidden">
      <header className="p-4 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}><ChevronRight className="rotate-180" /></Button>
          <input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent border-none text-xl font-black tracking-tight focus:ring-0 w-[400px] text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-secondary/30 rounded-lg p-1 mr-2 gap-1 border border-border">
              <button 
                  onClick={() => setMode('visual')}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-mono uppercase font-bold flex items-center gap-2 transition-all ${mode === 'visual' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-white'}`}
              >
                  <Type size={12} /> Visual
              </button>
              <button 
                  onClick={() => setMode('code')}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-mono uppercase font-bold flex items-center gap-2 transition-all ${mode === 'code' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-white'}`}
              >
                  <Code2 size={12} /> Code
              </button>
          </div>
          <Button variant="outline" size="sm" onClick={handlePresent} className="gap-2 font-mono text-[10px] uppercase h-9">
            <Play size={14} className="text-primary" /> Present
          </Button>
          
          <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
            <DialogTrigger
              render={
                <Button variant="outline" size="sm" className="gap-2 font-mono text-[10px] uppercase h-9 border-primary/20 hover:border-primary/50 text-white" />
              }
            >
              <Share2 size={14} className="text-primary" /> Exfiltrate
            </DialogTrigger>
            <DialogContent className="bg-black/95 border-primary/30 text-foreground">
              <DialogHeader>
                <DialogTitle className="uppercase font-mono tracking-widest text-primary">Security Protocol</DialogTitle>
              </DialogHeader>
              <div className="py-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="font-mono text-xs uppercase tracking-widest text-white">Access Level</Label>
                    <select 
                      value={shareConfig.access_type} 
                      onChange={(e) => setShareConfig({...shareConfig, access_type: e.target.value})}
                      className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-white"
                    >
                        <option value="public">Public (Anyone with link)</option>
                        <option value="password">Password Gated</option>
                    </select>
                  </div>
              </div>
              <DialogFooter>
                <Button className="w-full neon-border uppercase font-mono text-[10px] py-4" onClick={handleCreateShare}>Generate Protocol Link</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button size="sm" onClick={handleSave} className="gap-2 neon-border bg-primary text-black font-black uppercase text-[10px] h-9 px-6 font-mono">
            <Zap size={14} fill="currentColor" /> Commit
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col border-r border-border bg-[#1e1e1e] relative">
          <div className="p-2 border-b border-border bg-[#1e1e1e] flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-primary/60">
            <span className="px-3">buffer.html</span>
          </div>
          {mode === 'code' ? (
              <MonacoEditor
                height="100%"
                defaultLanguage="html"
                theme="vs-dark"
                value={content}
                onChange={(value) => setContent(value || '')}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on',
                    fontFamily: 'JetBrains Mono, monospace'
                }}
              />
          ) : (
              <VisualEditor content={content} onChange={(val) => setContent(value => val)} />
          )}
        </div>
        <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
          <iframe 
            className="w-full h-full border-none bg-white"
            srcDoc={`
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700;900&display=swap');
                    body { font-family: 'Inter', sans-serif; color: #000; line-height: 1.5; padding: 60px; margin: 0; background: #fff; }
                    h1 { font-size: 4rem; line-height: 1; margin: 0 0 30px 0; font-weight: 900; letter-spacing: -0.04em; }
                    p { font-size: 1.4rem; font-weight: 300; margin-bottom: 25px; }
                  </style>
                </head>
                <body>${content}</body>
              </html>
            `}
          />
        </div>
      </div>
    </div>
  );
}
