import { motion } from "motion/react";
import { 
  Plus, MoreVertical, Eye, Share2, Trash2, 
  Clock, ShieldCheck, ShieldAlert, BarChart3,
  Calendar, Lock, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Pitch } from "@/src/types";

interface DashboardProps {
  pitches: Pitch[];
  onNewPitch: () => void;
  onEditPitch: (pitch: Pitch) => void;
  onDeletePitch: (id: string) => void;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function Dashboard({ pitches, onNewPitch, onEditPitch, onDeletePitch }: DashboardProps) {
  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter uppercase font-mono text-primary">CyberVault Archive</h1>
          <p className="text-muted-foreground mt-1">Managed and secure document distribution system.</p>
        </div>
        <Button onClick={onNewPitch} className="bg-primary hover:bg-primary/90 text-white font-bold h-12 px-6">
          <Plus className="w-5 h-5 mr-2" />
          Secure New Document
        </Button>
      </div>

      {pitches.length === 0 ? (
        <div className="border border-dashed border-border rounded-none p-20 flex flex-col items-center justify-center text-center bg-card/20">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold uppercase font-mono">No active vaults</h2>
          <p className="text-muted-foreground max-w-sm mt-2">Initialize your first secure vault to start distribution and tracking.</p>
          <Button onClick={onNewPitch} variant="outline" className="mt-8">
            Initialize Vault
          </Button>
        </div>
      ) : (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {pitches.map((pitch) => (
            <motion.div key={pitch.id} variants={item}>
              <Card className="rounded-none border-border hover:border-primary/50 transition-colors bg-card group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    {pitch.isActive ? (
                      <ShieldCheck className="w-4 h-4 text-primary" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground font-mono">
                      {pitch.isActive ? 'Status: Active' : 'Status: Revoked'}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 size-8 hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50">
                      <MoreVertical className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-none border-border">
                      <DropdownMenuItem onClick={() => onEditPitch(pitch)}>
                        Edit Content
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Revoke Access
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => onDeletePitch(pitch.id)}>
                        Purge Resource
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <CardTitle className="text-xl font-bold truncate leading-tight group-hover:text-primary transition-colors">
                    {pitch.title}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-none text-[9px] uppercase font-bold border-border bg-muted/40">
                      ID: {pitch.id.substring(0, 8)}
                    </Badge>
                    {pitch.settings?.isGated && (
                      <Badge variant="outline" className="rounded-none text-[9px] uppercase font-bold bg-primary/10 text-primary border-primary/20">
                        Gated
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase font-bold">
                        <Users className="w-3 h-3" /> Views
                      </div>
                      <div className="text-lg font-bold font-mono tracking-tighter">{pitch.stats?.views ?? 0}</div>
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="text-[10px] text-muted-foreground flex items-center justify-end gap-1 uppercase font-bold">
                        <BarChart3 className="w-3 h-3" /> Engagemnt
                      </div>
                      <div className="text-lg font-bold font-mono tracking-tighter">84%</div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-border mt-2 pt-4 bg-muted/20 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase font-bold font-mono">
                    <Clock className="w-3 h-3" />
                    Updated: {new Date(pitch.updatedAt ?? pitch.updated_at).toLocaleDateString()}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary hover:text-white">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary hover:text-white">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
