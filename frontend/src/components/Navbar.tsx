import { motion } from "motion/react";
import { Shield, LayoutDashboard, FilePlus, Settings, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  onNavChange: (view: "dashboard" | "editor" | "settings") => void;
  currentView: string;
}

export function Navbar({ onNavChange, currentView }: NavbarProps) {
  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 overflow-hidden">
      <div className="flex h-16 items-center px-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 mr-8"
        >
          <div className="w-8 h-8 bg-primary rounded-none flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tighter mono-text uppercase">
            Pitch<span className="text-primary">Vault</span>
          </span>
        </motion.div>

        <div className="flex items-center space-x-1 lg:space-x-2">
          <Button
            variant={currentView === "dashboard" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onNavChange("dashboard")}
            className="flex items-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>
          <Button
            variant={currentView === "editor" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onNavChange("editor")}
            className="flex items-center gap-2"
          >
            <FilePlus className="w-4 h-4" />
            <span className="hidden sm:inline">New Pitch</span>
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="relative hidden md:flex items-center">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search Vault..." 
              className="bg-muted border border-border rounded-none h-9 pl-8 pr-4 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button variant="ghost" size="icon">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
      
      {/* Decorative scanning line animation */}
      <motion.div 
        animate={{ 
          left: ["-10%", "110%"],
          opacity: [0, 1, 0]
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity, 
          ease: "linear" 
        }}
        className="absolute bottom-0 h-[1px] w-40 bg-primary/50"
      />
    </nav>
  );
}
