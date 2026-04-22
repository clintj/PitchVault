import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, Lock, Eye, Clock, ChevronRight, ChevronLeft, Maximize, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pitch } from "@/src/types";

interface ViewerProps {
  pitch: Pitch;
  onExit: () => void;
}

export function PitchViewer({ pitch, onExit }: ViewerProps) {
  const [isLocked, setIsLocked] = useState(!!pitch.settings?.password);
  const [password, setPassword] = useState("");
  const [startTime] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeSpent = Math.floor((currentTime - startTime) / 1000);
  const formatTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

  if (isLocked) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-card border border-border p-8 space-y-6"
        >
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold uppercase tracking-widest font-mono text-primary">Secure Entry Required</h2>
            <p className="text-sm text-muted-foreground italic">You are attempting to access a managed resource vault.</p>
          </div>
          <div className="space-y-4">
            <Input 
              type="password" 
              placeholder="Enter Access Key" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-muted border-border font-mono text-center tracking-widest"
            />
            <Button 
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold"
              onClick={() => {
                if (password === pitch.settings?.password) {
                  setIsLocked(false);
                } else {
                  alert("Invalid Access Key");
                }
              }}
            >
              Verify Credentials
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col">
      {/* Immersive Viewer Controls */}
      <div className="absolute top-6 right-6 z-[210] flex items-center gap-4 group">
        <div className="hidden group-hover:flex items-center gap-4 bg-black/90 backdrop-blur-md px-4 py-2 rounded-none border border-white/10 text-white font-mono text-[10px] uppercase font-bold transition-all shadow-2xl">
          <div className="flex items-center gap-2 text-primary">
            <Eye className="w-3 h-3" />
            Live Session
          </div>
          <div className="w-[1px] h-3 bg-white/20" />
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            {formatTime(timeSpent)}
          </div>
          <div className="w-[1px] h-3 bg-white/20" />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onExit}
            className="h-auto p-0 hover:text-primary transition-colors uppercase font-bold text-[10px]"
          >
            <LogOut className="w-3 h-3 mr-1" /> Terminate
          </Button>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          className="bg-black/80 border-white/20 text-white rounded-full h-10 w-10 shadow-xl"
        >
          <Maximize className="w-4 h-4" />
        </Button>
      </div>
      
      <main className="flex-1 overflow-auto bg-white">
        <div className="max-w-4xl mx-auto py-24 px-12 prose prose-lg prose-slate min-h-screen border-x border-slate-100">
          <div dangerouslySetInnerHTML={{ __html: pitch.content ?? pitch.html_content ?? '' }} />
        </div>
        
        {/* Progress rail */}
        <div className="fixed bottom-0 left-0 w-full h-1 bg-slate-100">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </main>
      
      {/* Side branding */}
      <div className="fixed left-8 bottom-12 hidden lg:block text-slate-300 font-mono text-[9px] uppercase tracking-[0.3em] origin-bottom-left -rotate-90 pointer-events-none">
        CYBERVOLT // SECURE_DISTRIBUTION // CYDERES OPS
      </div>
    </div>
  );
}
