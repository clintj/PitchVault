import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'sonner';

import { AuthPage } from '../pages/AuthPage';
import { Dashboard } from '../pages/Dashboard';
import { EditorPage } from '../pages/EditorPage';
import { ViewerPage } from '../pages/ViewerPage';
import { PresentationPage } from '../pages/PresentationPage';
import { AuthProvider, useAuth } from '../hooks/useAuth';

function LoadingScreen({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onFinish, 3000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[500] bg-black flex flex-col items-center justify-center overflow-hidden"
    >
      <motion.img 
        src="/Cyderes_Logo_0.svg" 
        alt="Cyderes"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="w-64 h-auto mb-8"
      />
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: "200px" }}
        transition={{ duration: 2.5, ease: "easeInOut" }}
        className="h-1 bg-primary/80 neon-border rounded-full"
      />
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-6 text-primary font-mono text-[10px] uppercase tracking-widest"
      >
        Loading PitchVault Systems...
      </motion.p>
    </motion.div>
  );
}

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="h-screen w-screen bg-black flex items-center justify-center text-primary font-mono text-sm uppercase">Verifying Authorization...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <AuthProvider>
      <AnimatePresence>
        {showSplash && <LoadingScreen onFinish={() => setShowSplash(false)} />}
      </AnimatePresence>
      <BrowserRouter>
        <div className="min-h-screen bg-background text-foreground font-sans">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/login" element={<AuthPage />} />
            
            <Route path="/dashboard" element={
              <PrivateRoute><Dashboard /></PrivateRoute>
            } />
            <Route path="/editor/:id" element={
              <PrivateRoute><EditorPage /></PrivateRoute>
            } />
            
            {/* Viewer pages (no main auth required) */}
            <Route path="/v/:slug" element={<ViewerPage />} />
            <Route path="/present/:slug" element={<PresentationPage />} />
          </Routes>
          <Toaster theme="dark" position="bottom-right" richColors />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
