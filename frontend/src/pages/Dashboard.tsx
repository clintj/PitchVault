import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LayoutDashboard, FilePlus, FolderPlus, Folder as FolderIcon, History, Zap, Settings, Search, Terminal, Globe, Trash2, ChevronRight, Users, UserPlus, ShieldAlert, Pencil, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { Pitch, Folder, User as UserType } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function parseUserAgent(ua: string | null | undefined): string {
  if (!ua) return 'Unknown Browser';

  let browser = 'Unknown';
  let os = 'Unknown OS';

  if (ua.includes('Chrome') && !ua.includes('Chromium')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edge')) browser = 'Edge';
  else if (ua.includes('Opera')) browser = 'Opera';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return `${browser} on ${os}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);

  const [isFolderModelOpen, setIsFolderModelOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [activeView, setActiveView] = useState<'vault' | 'audit' | 'analytics' | 'settings'>('vault');
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('New Encrypted Document');
  const [newDocContent, setNewDocContent] = useState('<h1>New Protocol</h1><p>Enter data...</p>');
  const [newDocFolderId, setNewDocFolderId] = useState('root');
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const [settingsMessage, setSettingsMessage] = useState('');

  // User management state
  const [users, setUsers] = useState<UserType[]>([]);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [userFormData, setUserFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'owner',
    is_verified: true
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const folderId = currentFolder?.id ?? null;
      const folderParams = folderId ? { parent_id: folderId } : undefined;
      const [docsRes, foldersRes] = await Promise.all([
        api.get('/documents/', { params: { folder_id: folderId ?? 'root' } }),
        api.get('/folders/', { params: folderParams })
      ]);
      setPitches(docsRes.data);
      setFolders(foldersRes.data);
    } catch (e) {
      toast.error('Failed to load storage.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentFolder]);

  useEffect(() => {
    if (activeView === 'audit') {
      api.get('/admin/audit')
        .then((res) => setAuditEvents(res.data))
        .catch((e) => toast.error(e.response?.data?.detail || 'Failed to load audit logs.'));
    }
    if (activeView === 'analytics') {
      api.get('/admin/analytics')
        .then((res) => setAnalytics(res.data))
        .catch((e) => toast.error(e.response?.data?.detail || 'Failed to load analytics.'));
    }
    if (activeView === 'settings') {
      api.get('/admin/settings')
        .then((res) => setAdminSettings(res.data))
        .catch((e) => toast.error(e.response?.data?.detail || 'Failed to load admin settings.'));
      
      // Also fetch users for user management tab
      fetchUsers();
    }
  }, [activeView]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (e) {
      toast.error('Failed to load user registry.');
    }
  };

  const handleCreateUser = async () => {
    try {
      await api.post('/admin/users', userFormData);
      toast.success("User registered.");
      setIsUserDialogOpen(false);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Registration failure.');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      // Don't send empty password
      const payload = { ...userFormData };
      if (!payload.password) delete payload.password;
      
      await api.put(`/admin/users/${editingUser.id}`, payload);
      toast.success("User profile updated.");
      setIsUserDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Update failure.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === user?.id) {
      toast.error("Cannot delete your own admin account.");
      return;
    }
    if (!confirm("Are you sure you want to delete this operator?")) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success("Operator removed from registry.");
      fetchUsers();
    } catch (e) {
      toast.error("Deletion failure.");
    }
  };

  const openUserDialog = (userToEdit?: UserType) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setUserFormData({
        email: userToEdit.email,
        name: userToEdit.name,
        password: '',
        role: userToEdit.role,
        is_verified: userToEdit.is_verified
      });
    } else {
      setEditingUser(null);
      setUserFormData({
        email: '',
        name: '',
        password: '',
        role: 'owner',
        is_verified: true
      });
    }
    setIsUserDialogOpen(true);
  };

  const handleCreateDocument = async () => {
    try {
      const res = await api.post('/documents/', {
        title: newDocTitle.trim() || 'New Encrypted Document',
        html_content: newDocContent,
        folder_id: newDocFolderId === 'root' ? null : newDocFolderId
      });
      setIsIngestOpen(false);
      setNewDocTitle('New Encrypted Document');
      setNewDocContent('<h1>New Protocol</h1><p>Enter data...</p>');
      setNewDocFolderId(currentFolder?.id ?? 'root');
      navigate(`/editor/${res.data.id}`);
    } catch (e) {
      toast.error('Failed to initialize record.');
    }
  };

  const openIngestDialog = () => {
    setNewDocFolderId(currentFolder?.id ?? 'root');
    setIsIngestOpen(true);
  };

  const handleSaveSettings = async () => {
    if (!adminSettings) return;
    const hasPendingAdminEntraId = Boolean((adminSettings.admin_entra_id || '').trim());
    if (adminSettings.disable_password_auth && !adminSettings.has_entra_admin && !hasPendingAdminEntraId) {
      const message = 'Add the current admin Entra object ID before disabling password auth.';
      setSettingsMessage(message);
      toast.error(message);
      return;
    }
    try {
      const res = await api.put('/admin/settings', adminSettings);
      setAdminSettings(res.data);
      setSettingsMessage('Settings saved.');
      toast.success('Admin settings updated.');
    } catch (e: any) {
      setSettingsMessage(e.response?.data?.detail || 'Failed to save settings.');
      toast.error(e.response?.data?.detail || 'Failed to save settings.');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await api.post('/folders/', {
        name: newFolderName,
        parent_id: currentFolder ? currentFolder.id : null
      });
      toast.success("Directory registered.");
      setNewFolderName('');
      setIsFolderModelOpen(false);
      fetchData();
    } catch (e) {
      toast.error('Failed to create directory.');
    }
  };

  const handleDelete = async (id: string, type: 'doc' | 'folder') => {
    try {
      if (type === 'doc') {
        await api.delete(`/documents/${id}`);
        setPitches(pitches.filter(p => p.id !== id));
      } else {
        await api.delete(`/folders/${id}`);
        setFolders(folders.filter(f => f.id !== id));
      }
      toast.success('Record archived.');
    } catch (e) {
      toast.error('Deletion failure. Directory may not be empty.');
    }
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    const docId = e.dataTransfer.getData("docId");
    if (!docId) return;

    try {
      await api.put(`/documents/${docId}`, { folder_id: targetFolderId });
      toast.success("Item relocated.");
      fetchData();
    } catch (err) {
      toast.error("Failed to move item.");
    }
  };

  const allowDrop = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const filteredPitches = pitches.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden relative text-foreground">
      <aside className="w-64 border-r border-border bg-card/60 backdrop-blur-xl flex flex-col z-20">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center shadow-[0_0_12px_rgba(1,105,111,0.4)]">
            <Shield className="w-5 h-5 text-black" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-xl text-white leading-none uppercase">PITCH<span className="text-primary italic">VAULT</span></span>
            <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-[0.2em] mt-1">Managed Resource OPS</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          <NavItem icon={<LayoutDashboard size={18} />} label="Secure Vault" active={activeView === 'vault'} onClick={() => { setActiveView('vault'); setCurrentFolder(null); }} />
          <NavItem icon={<History size={18} />} label="Audit Logs" active={activeView === 'audit'} onClick={() => setActiveView('audit')} />
          <NavItem icon={<Zap size={18} />} label="Analytics" active={activeView === 'analytics'} onClick={() => setActiveView('analytics')} />
          <NavItem icon={<Settings size={18} />} label="Admin Settings" active={activeView === 'settings'} onClick={() => setActiveView('settings')} />
        </nav>

        <footer className="p-6 mt-auto border-t border-border bg-secondary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/10 overflow-hidden w-full">
                <div className="w-10 h-10 shrink-0 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-sm uppercase">
                    {user?.name?.substring(0,2) || 'OP'}
                </div>
                <div className="overflow-hidden flex-1">
                    <p className="text-sm font-medium truncate text-white">{user?.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate uppercase tracking-tighter">{user?.role}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { logout(); navigate('/login'); }} className="text-muted-foreground hover:text-white shrink-0">
                    <Settings size={16} />
                </Button>
            </div>
          </div>
        </footer>
      </aside>

      <main className="flex-1 p-10 flex flex-col z-10 relative">
        <header className="mb-8 flex items-end justify-between">
          <div className="space-y-1">
            <h1 className="text-5xl font-black tracking-tighter text-white uppercase leading-none flex items-center gap-4">
               {activeView === 'audit' ? (
                 <>Audit <span className="text-primary italic">Logs</span></>
               ) : activeView === 'analytics' ? (
                 <>Operational <span className="text-primary italic">Analytics</span></>
               ) : activeView === 'settings' ? (
                 <>Admin <span className="text-primary italic">Settings</span></>
               ) : currentFolder ? (
                 <>
                   <button onClick={() => setCurrentFolder(null)} className="text-muted-foreground hover:text-white transition-colors">Archive</button>
                   <ChevronRight className="text-primary w-10 h-10" />
                   <span className="text-primary italic">{currentFolder.name}</span>
                 </>
               ) : (
                  <>Resource <span className="text-primary italic">Archive</span></>
               )}
            </h1>
            <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest pt-2">Encrypted content management</p>
          </div>
          {activeView === 'vault' && <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input 
                placeholder="Query Records..." 
                className="pl-10 w-[240px] bg-card/40 border-border font-mono text-xs h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={() => setIsFolderModelOpen(true)} className="h-10 neon-border border-primary/40 bg-secondary/20 hover:bg-secondary/40 text-white font-bold uppercase tracking-widest text-[10px] px-4 gap-2">
              <FolderPlus size={16} /> Directory
            </Button>
            <Button onClick={openIngestDialog} className="h-10 neon-border bg-primary text-black font-bold uppercase tracking-widest text-[10px] px-6 gap-2">
              <FilePlus size={16} /> Ingest Record
            </Button>
          </div>}
        </header>

        {activeView === 'audit' && (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-3">
              {auditEvents.length === 0 ? (
                <div className="border border-dashed border-primary/20 bg-primary/5 rounded-lg p-10 font-mono text-xs uppercase text-muted-foreground">No audit events found</div>
              ) : auditEvents.map((event, index) => (
                <div key={`${event.time}-${index}`} className="border border-border bg-card/50 rounded-lg p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="uppercase font-mono text-[9px] border-primary/20 text-primary">{event.type}</Badge>
                      <span className="text-white font-semibold text-sm">{event.document_title}</span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">{event.time ? new Date(event.time).toLocaleString() : 'Unknown'}</span>
                  </div>

                  {event.type === 'viewer' && (
                    <div className="space-y-2 text-xs">
                      <p className="text-muted-foreground">
                        {event.viewer_name && <span className="text-white font-medium">{event.viewer_name}</span>}
                        {event.viewer_email && <span className="text-muted-foreground"> ({event.viewer_email})</span>}
                        {!event.viewer_name && !event.viewer_email && <span className="text-muted-foreground">anonymous</span>}
                        {' • '}
                        <span className="font-mono">{event.ip_address || 'unknown IP'}</span>
                        {' • '}
                        <span>{parseUserAgent(event.user_agent)}</span>
                        {' • '}
                        <span>Accessed {event.access_count} time{event.access_count !== 1 ? 's' : ''}</span>
                      </p>
                      {event.share_slug && (
                        <p className="text-primary/80 font-mono text-[9px]">/v/{event.share_slug}</p>
                      )}
                    </div>
                  )}

                  {event.type === 'share' && (
                    <p className="text-primary/80 font-mono text-[9px]">/v/{event.share_slug}</p>
                  )}

                  {event.type === 'document' && (
                    <p className="text-muted-foreground text-xs">Document created</p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {activeView === 'analytics' && (
          <div className="flex-1 space-y-6 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[
                ['Documents', analytics?.documents ?? 0],
                ['Active', analytics?.active_documents ?? 0],
                ['Shares', analytics?.shares ?? 0],
                ['Sessions', analytics?.viewer_sessions ?? 0],
                ['Views', analytics?.total_views ?? 0],
              ].map(([label, value]) => (
                <div key={label} className="border border-border bg-card/50 rounded-lg p-5">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
                  <p className="mt-3 text-3xl font-black text-primary">{value}</p>
                </div>
              ))}
            </div>

            <div className="border border-border bg-card/50 rounded-lg p-6">
              <h2 className="font-mono text-xs uppercase tracking-widest text-white mb-4">Top Share Links</h2>
              {(analytics?.top_shares ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm">No share activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {analytics.top_shares.map((share: any) => (
                    <div key={share.slug} className="flex items-center justify-between border border-border/50 rounded p-3 bg-black/30">
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm">{share.document_title}</p>
                        <code className="text-primary text-xs">/v/{share.slug}</code>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-xs text-muted-foreground">{share.views} views</span>
                        {share.expires_at && (
                          <Badge variant="outline" className="text-[9px] border-primary/20 text-primary">
                            Expires {new Date(share.expires_at).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-border bg-card/50 rounded-lg p-6">
              <h2 className="font-mono text-xs uppercase tracking-widest text-white mb-4">Recent Activity</h2>
              {(analytics?.recent_sessions ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm">No recent sessions.</p>
              ) : (
                <div className="space-y-3">
                  {analytics.recent_sessions.map((session: any, idx: number) => (
                    <div key={idx} className="border border-border/50 rounded p-3 bg-black/30">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-white font-semibold text-sm">{session.document_title}</p>
                          <p className="text-muted-foreground text-xs">
                            {session.viewer_name && <span className="text-white font-medium">{session.viewer_name}</span>}
                            {session.viewer_email && <span className="text-muted-foreground"> ({session.viewer_email})</span>}
                            {!session.viewer_name && !session.viewer_email && <span>anonymous</span>}
                          </p>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {new Date(session.started_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground space-x-2">
                        <span className="font-mono">{session.ip_address || 'unknown IP'}</span>
                        <span>•</span>
                        <span>{parseUserAgent(session.user_agent)}</span>
                        <span>•</span>
                        <span>{formatDuration(session.total_time_seconds)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'settings' && adminSettings && (
          <ScrollArea className="flex-1 pr-4">
            <div className="max-w-4xl space-y-5">
              <Tabs defaultValue="system" className="w-full">
                <TabsList className="bg-card border border-border mb-6">
                  <TabsTrigger value="system" className="font-mono text-[10px] uppercase px-6 data-[state=active]:bg-primary data-[state=active]:text-black">System Config</TabsTrigger>
                  <TabsTrigger value="users" className="font-mono text-[10px] uppercase px-6 data-[state=active]:bg-primary data-[state=active]:text-black">User Registry</TabsTrigger>
                </TabsList>

                <TabsContent value="system" className="space-y-5">
                  <div className="border border-border bg-card/50 rounded-lg p-6 space-y-4">
                    <h2 className="font-mono text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                      <ShieldAlert size={14} /> Microsoft Entra ID App Config
                    </h2>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase text-muted-foreground font-mono">Client ID</Label>
                      <Input value={adminSettings.entra_client_id || ''} onChange={(e) => setAdminSettings({ ...adminSettings, entra_client_id: e.target.value })} className="bg-card/40 border-border text-white font-mono text-xs h-10" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase text-muted-foreground font-mono">Tenant ID</Label>
                      <Input value={adminSettings.entra_tenant_id || ''} onChange={(e) => setAdminSettings({ ...adminSettings, entra_tenant_id: e.target.value })} className="bg-card/40 border-border text-white font-mono text-xs h-10" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase text-muted-foreground font-mono">Redirect URI</Label>
                      <Input value={adminSettings.entra_redirect_uri || ''} onChange={(e) => setAdminSettings({ ...adminSettings, entra_redirect_uri: e.target.value })} className="bg-card/40 border-border text-white font-mono text-xs h-10" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase text-muted-foreground font-mono">Current Admin Entra Object ID</Label>
                      <Input value={adminSettings.admin_entra_id || ''} onChange={(e) => setAdminSettings({ ...adminSettings, admin_entra_id: e.target.value })} className="bg-card/40 border-border text-white font-mono text-xs h-10" />
                    </div>
                  </div>
                  <div className="border border-border bg-card/50 rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h2 className="font-mono text-xs uppercase tracking-widest text-primary">Disable Password Auth</h2>
                        <p className="text-[10px] text-muted-foreground mt-2 uppercase">Allowed only after at least one admin has an Entra object ID.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(adminSettings.disable_password_auth)}
                        onChange={(e) => setAdminSettings({ ...adminSettings, disable_password_auth: e.target.checked })}
                        className="h-5 w-5 accent-primary bg-card border-border"
                      />
                    </div>
                    <Badge variant="outline" className={adminSettings.has_entra_admin ? 'border-primary/30 text-primary font-mono text-[9px]' : 'border-destructive/30 text-destructive font-mono text-[9px]'}>
                      {adminSettings.has_entra_admin ? 'Entra admin present' : 'No Entra admin present'}
                    </Badge>
                    {settingsMessage && <p className="text-[10px] font-mono text-muted-foreground uppercase">{settingsMessage}</p>}
                    <Button onClick={handleSaveSettings} className="bg-primary text-black font-bold uppercase tracking-widest text-[10px] h-10 px-8 neon-border">Commit System Config</Button>
                  </div>
                </TabsContent>

                <TabsContent value="users" className="space-y-6">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <h2 className="font-mono text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                      <Users size={16} /> Operator Registry
                    </h2>
                    <Button onClick={() => openUserDialog()} className="h-9 neon-border bg-primary text-black font-bold uppercase tracking-widest text-[10px] px-4 gap-2">
                      <UserPlus size={16} /> Register Operator
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {users.map(u => (
                      <div key={u.id} className="border border-border bg-card/40 rounded-lg p-4 flex items-center justify-between group hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-primary border border-border group-hover:border-primary/20">
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-white">{u.name}</p>
                              <Badge variant="outline" className="text-[8px] uppercase py-0 px-1 border-primary/20 text-primary font-mono">{u.role}</Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => openUserDialog(u)} className="h-8 w-8 text-muted-foreground hover:text-white">
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        )}

        {activeView === 'vault' && <>
        {currentFolder && (
          <div 
             className="mb-6 p-4 border border-dashed border-primary/30 rounded-lg hover:bg-primary/5 transition-colors flex items-center justify-center cursor-pointer"
             onDrop={(e) => handleDrop(e, null)}
             onDragOver={allowDrop}
             onClick={() => setCurrentFolder(null)}
          >
             <p className="font-mono text-[10px] uppercase tracking-widest text-primary">← Drop items here to move to Root Archive</p>
          </div>
        )}

        {loading ? (
             <div className="flex-1 flex items-center justify-center font-mono uppercase text-primary/50 text-xs">Querying Databases...</div>
        ) : filteredPitches.length === 0 && filteredFolders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-primary/20 bg-primary/5 rounded-lg">
            <Terminal className="text-primary w-12 h-12 mb-4" />
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">No records detected in buffer</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <motion.div 
               className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 gap-6 pb-20"
               initial="hidden"
               animate="visible"
               variants={{
                 visible: { transition: { staggerChildren: 0.05 } }
               }}
            >
              <AnimatePresence>
                {/* Render Folders */}
                {filteredFolders.map(folder => (
                  <motion.div 
                    key={`folder-${folder.id}`} 
                    layoutId={`folder-${folder.id}`}
                    layout
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, scale: 0.9 }}
                    onDrop={(e: any) => handleDrop(e, folder.id)}
                    onDragOver={allowDrop}
                    onClick={() => setCurrentFolder(folder)}
                    className="bg-card border border-border hover:border-primary/60 transition-all rounded-lg p-6 flex flex-col items-center justify-center gap-3 cursor-pointer group shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(1,105,111,0.2)]"
                  >
                    <FolderIcon className="w-12 h-12 text-primary/50 group-hover:text-primary transition-colors" />
                    <span className="font-bold text-white uppercase text-sm tracking-widest truncate w-full text-center">{folder.name}</span>
                    <button 
                       onClick={(e) => { e.stopPropagation(); handleDelete(folder.id, 'folder'); }} 
                       className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 hover:text-destructive text-muted-foreground transition-all"
                    >
                       <Trash2 size={12} />
                    </button>
                  </motion.div>
                ))}

                {/* Render Documents */}
                {filteredPitches.map(pitch => (
                  <motion.div
                    key={`doc-${pitch.id}`}
                    layoutId={`doc-${pitch.id}`}
                    layout
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, scale: 0.9 }}
                    draggable
                    onDragStart={(e: any) => e.dataTransfer.setData("docId", pitch.id)}
                  >
                    <Card className="bg-card/40 border-border hover:border-primary/40 transition-all overflow-hidden group h-full flex flex-col shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                      <CardHeader className="pb-3 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <Badge variant="outline" className="font-mono text-[9px] border-primary/20 text-primary">ID_{pitch.id.substring(0,8)}</Badge>
                            <Globe size={14} className={pitch.is_archived ? 'text-muted-foreground' : 'text-primary'} />
                        </div>
                        <CardTitle className="text-xl text-white group-hover:text-primary transition-colors line-clamp-2">{pitch.title}</CardTitle>
                        <CardDescription className="text-[10px] font-mono uppercase tracking-widest mt-auto pt-4">Updated {new Date(pitch.updated_at || pitch.created_at).toLocaleDateString()}</CardDescription>
                      </CardHeader>
                      <div className="flex border-t border-border/50 divide-x divide-border/50 bg-secondary/10 shrink-0">
                        <button onClick={() => navigate(`/editor/${pitch.id}`)} className="flex-1 py-3 text-[10px] font-mono uppercase font-bold tracking-widest hover:bg-primary/10 hover:text-primary text-white transition-colors">Access</button>
                        <button onClick={() => handleDelete(pitch.id, 'doc')} className="px-4 py-3 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </ScrollArea>
        )}
        </>}
      </main>

      <Dialog open={isFolderModelOpen} onOpenChange={setIsFolderModelOpen}>
        <DialogContent className="bg-black/95 border-primary/30 text-foreground">
          <DialogHeader>
            <DialogTitle className="uppercase font-mono tracking-widest text-primary text-sm">Initialize Directory</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Input 
                  placeholder="Directory Alias" 
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-card/50 border-border text-white h-12 uppercase font-mono tracking-widest placeholder:opacity-50"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
              </div>
          </div>
          <DialogFooter>
            <Button className="w-full neon-border uppercase font-mono text-[10px] py-4 rounded-sm" onClick={handleCreateFolder}>Deploy Directory</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isIngestOpen} onOpenChange={setIsIngestOpen}>
        <DialogContent className="bg-black/95 border-primary/30 text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="uppercase font-mono tracking-widest text-primary text-sm">Ingest Record</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                className="w-full bg-card/50 border-border text-white h-11 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Target Folder</Label>
              <select
                value={newDocFolderId}
                onChange={(e) => setNewDocFolderId(e.target.value)}
                className="w-full bg-card/50 border border-border rounded-md px-3 py-2 text-sm text-white"
              >
                <option value="root">Root Archive</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Initial HTML</Label>
              <Textarea
                value={newDocContent}
                onChange={(e) => setNewDocContent(e.target.value)}
                className="min-h-32 bg-card/50 border-border text-white font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full neon-border uppercase font-mono text-[10px] py-4 rounded-sm" onClick={handleCreateDocument}>Create Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="bg-black/95 border-primary/30 text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase font-mono tracking-widest text-primary text-sm flex items-center gap-2">
               <UserPlus size={16} /> {editingUser ? 'Modify Operator' : 'Register Operator'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase text-muted-foreground font-mono">Full Name</Label>
              <Input
                value={userFormData.name}
                onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                className="w-full bg-card/50 border-border text-white h-11 font-mono text-xs"
                placeholder="Agent Name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase text-muted-foreground font-mono">Email Address</Label>
              <Input
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                className="w-full bg-card/50 border-border text-white h-11 font-mono text-xs"
                placeholder="operator@cyderes.com"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase text-muted-foreground font-mono flex justify-between">
                <span>Master Password</span>
                {editingUser && <span className="text-[8px] normal-case text-primary opacity-50 italic">Leave blank to keep current</span>}
              </Label>
              <div className="relative">
                <Input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  className="w-full bg-card/50 border-border text-white h-11 font-mono text-xs pl-10"
                  placeholder="••••••••"
                />
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase text-muted-foreground font-mono">Access Level</Label>
              <select
                value={userFormData.role}
                onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                className="w-full bg-card/50 border border-border rounded-md px-3 py-2 text-xs text-white font-mono h-11"
              >
                <option value="owner">Operator (Owner)</option>
                <option value="admin">System Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full neon-border bg-primary text-black font-black uppercase font-mono text-[10px] py-4 rounded-sm" onClick={editingUser ? handleUpdateUser : handleCreateUser}>
              {editingUser ? 'Commit Profile Update' : 'Initialize Operator'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-sm transition-all duration-200 group relative ${
        active 
          ? 'bg-primary/10 text-primary border border-primary/20 neon-border' 
          : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground border border-transparent'
      }`}
    >
      <span className={`${active ? 'text-primary' : 'group-hover:text-primary'} transition-colors`}>{icon}</span>
      <span className="text-[10px] font-bold tracking-widest uppercase font-mono">{label}</span>
      {active && <motion.div layoutId="active-nav" className="absolute right-0 w-1 h-3 bg-primary" />}
    </button>
  );
}
