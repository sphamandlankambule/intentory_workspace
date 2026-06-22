import React, { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext.tsx';
import { DashboardStats } from './components/DashboardStats.tsx';
import { MovementChart } from './components/MovementChart.tsx';
import { CatalogTable } from './components/CatalogTable.tsx';
import { AuditLogTable } from './components/AuditLogTable.tsx';
import { UserRoleManagement } from './components/UserRoleManagement.tsx';
import { InventoryItem, MovementLog, TrendStat } from './types.ts';
import { 
  LogIn, LogOut, Package, ListFilter, ClipboardList, ShieldAlert,
  Loader2, AlertTriangle, ShieldCheck, Mail, Archive
} from 'lucide-react';

export default function App() {
  const { user, dbUser, token, loading, login, register, logout } = useAuth();
  
  // Dashboard & Catalog Data States
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<MovementLog[]>([]);
  const [stats, setStats] = useState<TrendStat[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');

  // Local Credentials Auth States
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Tab control state
  const [activeTab, setActiveTab] = useState<'inventory' | 'audit' | 'users'>('inventory');

  // Load backend stats & data
  const loadWorkspaceData = async () => {
    if (!token) return;
    setDataLoading(true);
    setDataError('');
    try {
      // Fetch in parallel
      const [invRes, movRes, statsRes] = await Promise.all([
        fetch('/api/inventory', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/movements', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/movements/stats', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (!invRes.ok || !movRes.ok || !statsRes.ok) {
        throw new Error('Connection failed while loading server database records.');
      }

      const invData = await invRes.json();
      const movData = await movRes.json();
      const statsData = await statsRes.json();

      setItems(invData);
      setMovements(movData);
      setStats(statsData);
    } catch (err: any) {
      console.error(err);
      setDataError(err.message || 'Failed to synchronize with server database.');
    } finally {
      setDataLoading(false);
    }
  };

  // Submit Handler for local credentials
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const trimmedEmail = authEmail.trim();
    if (!trimmedEmail || !authPassword) {
      setAuthError('Email and password fields are required.');
      return;
    }
    if (authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }
    setAuthSubmitting(true);
    try {
      if (authMode === 'login') {
        await login(trimmedEmail, authPassword);
      } else {
        await register(trimmedEmail, authPassword);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please check credentials or network.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Trigger load when token rotates
  useEffect(() => {
    if (token) {
      loadWorkspaceData();
    }
  }, [token]);

  // Calculate alerts list (item stock <= minStock)
  const activeAlerts = items.filter(i => i.stock <= i.minStock);

  // If AuthContext is loading, display a gorgeous central spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafb] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-xs font-mono tracking-wider text-slate-400 uppercase">Synchronizing local session...</span>
      </div>
    );
  }

  // --- SIGN IN SCREEN ---
  if (!user) {
    return (
      <div id="login-layout" className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden p-8 space-y-6">
          
          <div className="text-center space-y-2">
            <div className="bg-indigo-600 text-white p-3.5 rounded-2xl w-min mx-auto shadow-lg shadow-indigo-500/20">
              <Archive className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold font-sans text-slate-900 tracking-tight uppercase">INV-TRACE SYSTEM</h2>
            <p className="text-xs text-slate-400 font-sans max-w-xs mx-auto leading-relaxed">
              Local hosted secure warehouse operations & traceability database engine
            </p>
          </div>

          {/* Tab buttons to toggle login / register */}
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50">
            <button
              onClick={() => {
                setAuthMode('login');
                setAuthError('');
              }}
              className={`py-2 px-3 text-xs font-mono uppercase font-bold rounded-xl transition-all cursor-pointer ${
                authMode === 'login' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthMode('register');
                setAuthError('');
              }}
              className={`py-2 px-3 text-xs font-mono uppercase font-bold rounded-xl transition-all cursor-pointer ${
                authMode === 'register' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Configure Account
            </button>
          </div>

          {authError && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3.5 rounded-2xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Form wrapper */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                Email/Username Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="operator@warehouse.com"
                  disabled={authSubmitting}
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250/70 rounded-xl pl-9 pr-3 py-2.5 text-xs font-sans text-slate-800 focus:outline-hidden focus:border-indigo-500 placeholder:text-slate-400 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                Security Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••"
                disabled={authSubmitting}
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-250/70 rounded-xl px-3 py-2.5 text-xs font-sans text-slate-800 focus:outline-hidden focus:border-indigo-500 placeholder:text-slate-400 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-mono font-bold py-3.5 px-4 rounded-xl cursor-pointer transition-colors shadow-md shadow-indigo-500/15"
            >
              {authSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AUTHENTICATING CLIENT...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  {authMode === 'login' ? 'AUTHORIZE OPERATOR' : 'REGISTER NEW OPERATOR'}
                </>
              )}
            </button>
          </form>



          <div className="bg-slate-50 border border-slate-250/50 rounded-2xl p-3.5">
            <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold mb-1">traceability notice</h4>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              Every checkout distributed or stock received is linked to your authenticated operator account in the local postgres database ledger.
            </p>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div id="dashboard-layout" className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-900 overflow-hidden">
      
      {/* 📱 MOBILE NAVIGATION HEADER (Visible on viewport < md) */}
      <header className="md:hidden bg-slate-900 text-white p-4 flex flex-col gap-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Archive className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight text-white uppercase">INV-TRACE</span>
          </div>
          <div className="text-[10px] font-mono bg-slate-800 text-indigo-300 px-2 py-1 rounded-sm uppercase font-bold">
            {dbUser ? dbUser.role : 'operator'}
          </div>
        </div>
        
        {/* Mobile Tab Pill Selectors */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'inventory' 
                ? 'bg-indigo-600 text-white font-bold' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Catalog Workspace</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit' 
                ? 'bg-indigo-600 text-white font-bold' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Ledger Logs</span>
          </button>

          {dbUser?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === 'users' 
                  ? 'bg-indigo-600 text-white font-bold' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-755'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-300" />
              <span>RBAC Panel</span>
            </button>
          )}

          <button
            onClick={logout}
            className="ml-auto bg-slate-800 text-slate-300 hover:bg-slate-700 p-2 rounded-lg"
            title="Leave Engine"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 💻 SLEEK DESKTOP SIDEBAR (Visible on viewport >= md) */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-350 flex-col flex-shrink-0 sticky top-0 h-screen border-r border-slate-850">
        {/* Brand Header */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-850">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
            <Archive className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <span className="font-bold text-base text-white tracking-tight uppercase block">INV-TRACE</span>
            <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase tracking-wider">WAREHOUSE ENGINE</span>
          </div>
        </div>

        {/* Sidebar Nav Actions */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          <button
            id="tab-inventory"
            onClick={() => setActiveTab('inventory')}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all cursor-pointer border ${
              activeTab === 'inventory' 
                ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 font-bold shadow-xs' 
                : 'text-slate-400 border-transparent hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Package className="w-4.5 h-4.5" />
            <span>Catalog Workspace</span>
          </button>

          <button
            id="tab-audit"
            onClick={() => setActiveTab('audit')}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all cursor-pointer border ${
              activeTab === 'audit' 
                ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 font-bold shadow-xs' 
                : 'text-slate-400 border-transparent hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ClipboardList className="w-4.5 h-4.5" />
            <span>Traceability Ledger</span>
          </button>

          {dbUser?.role === 'admin' && (
            <button
              id="tab-users"
              onClick={() => setActiveTab('users')}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all cursor-pointer border ${
                activeTab === 'users' 
                  ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 font-bold shadow-xs' 
                  : 'text-slate-400 border-transparent hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-4.5 h-4.5 text-rose-500" />
              <span>RBAC Permissions</span>
            </button>
          )}
        </nav>

        {/* Sidebar Footer User Profile */}
        <div className="p-4 border-t border-slate-850 bg-slate-950/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs uppercase shadow-inner">
              {user.email ? user.email.slice(0, 2).toUpperCase() : 'OP'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate" title={user.email}>{user.email}</p>
              <p className="text-[10px] text-slate-500 truncate uppercase tracking-widest font-bold">
                {dbUser ? dbUser.role : 'operator'}
              </p>
            </div>
          </div>
          <button
            id="btn-logout"
            onClick={logout}
            className="w-full inline-flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-mono font-semibold cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            LEAVE ENGINE
          </button>
        </div>
      </aside>

      {/* ⚙️ MAIN WRAPPER CONTAINER (Scrollable) */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50">
        
        {/* ⚠️ SYSTEM ALERTS WARNING RIBBON */}
        {activeAlerts.length > 0 && (
          <div id="alert-banner" className="bg-rose-600 text-white font-sans text-xs px-6 py-3 flex items-center justify-between shadow-md z-40 transition-transform">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-bounce text-rose-100" />
              <span className="font-semibold">
                Real-time Stock Alarm: <span className="underline font-bold">{activeAlerts.length} product SKU codes</span> require immediate replenishment.
              </span>
            </div>
            <button 
              id="btn-jump-alerts"
              onClick={() => {
                setActiveTab('inventory');
              }}
              className="bg-white/20 hover:bg-white/35 px-2.5 py-1 rounded font-mono text-[10px] uppercase font-bold tracking-wide transition-colors cursor-pointer"
            >
              Review Alarms
            </button>
          </div>
        )}

        {/* TOP STATUS HEADER BAR */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
          <div>
            <span className="text-[9px] font-mono text-indigo-600 font-black uppercase tracking-widest block mb-0.5">ADMIN SECURE OPERATIONS</span>
            <h1 className="text-xl font-bold font-sans tracking-tight text-slate-900 uppercase">
              {activeTab === 'inventory' ? 'Inventory Workspace' : activeTab === 'audit' ? 'Traceability ledger' : 'RBAC Control Panel'}
            </h1>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* System Health stats banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <div className="text-[10px] font-mono leading-none">
                <span className="text-slate-400 block tracking-wider font-semibold">CLOUD STATUS</span>
                <span className="text-slate-700 font-bold uppercase">98.4% uptime OK</span>
              </div>
            </div>

            <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>

            {/* Quick status pill */}
            <div className="text-[10px] bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg text-slate-600 font-mono font-medium hidden sm:block">
              SQL CORE VERIFIED
            </div>
          </div>
        </header>

        {/* COMPONENT BODY VIEWPORT */}
        <div id="main-content" className="p-6 space-y-6 flex-1 min-h-0">
          
          {dataError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-2xl flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500" />
              <div className="space-y-0.5">
                <strong className="block font-sans font-bold">Ledger Connection Exception</strong>
                <span className="font-sans text-slate-600">{dataError}</span>
              </div>
            </div>
          )}

          {/* LOADING FEEDBACK MASK */}
          {dataLoading && (
            <div className="text-xs font-mono font-bold text-slate-500 uppercase bg-white border border-slate-250/50 rounded-2xl py-3 px-4 flex items-center gap-2.5 justify-center shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              Syncing operational metrics from cloud datastore...
            </div>
          )}

          {/* CONDITIONAL COMPONENT GRAPH */}
          <div className="space-y-6">
            
            {activeTab === 'inventory' && (
              <div className="space-y-6">
                
                {/* 1. Stats row */}
                <DashboardStats 
                  items={items} 
                  movements={movements} 
                  alertsCount={activeAlerts.length} 
                />

                {/* 2. Beautiful Recharts Bento Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Historical Trends Graph Card (occupies 2 columns) */}
                  <div className="lg:col-span-2">
                    <MovementChart stats={stats} />
                  </div>

                  {/* Active Stock Alarms Card (the Critical Alerts sidebar widget) */}
                  <section className="bg-red-50/70 border-2 border-red-100 rounded-3xl p-6 flex flex-col shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="px-2.5 py-1 bg-red-100 text-red-700 text-[10px] font-black uppercase rounded-md tracking-wider">
                          Critical Alerts
                        </span>
                        <p className="text-[10px] text-red-500 mt-1 font-mono">STOCK BELOW SAFE REORDER LEVEL</p>
                      </div>
                      <span className="text-red-600 font-bold text-3xl tracking-tighter leading-none">
                        {String(activeAlerts.length).padStart(2, '0')}
                      </span>
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[250px] pr-1">
                      {activeAlerts.length === 0 ? (
                        <div className="bg-white p-5 rounded-2xl text-center border border-emerald-100 text-slate-600 text-xs flex flex-col items-center gap-2 justify-center h-full">
                          <ShieldCheck className="w-7 h-7 text-emerald-500" />
                          <p className="font-semibold text-emerald-800">All SKU levels in safe state</p>
                        </div>
                      ) : (
                        activeAlerts.map(alert => (
                          <div key={alert.id} className="bg-white p-3.5 rounded-2xl shadow-xs border border-red-100/80 hover:border-red-200 transition-colors">
                            <p className="text-xs font-bold text-slate-800 tracking-tight">{alert.name}</p>
                            <div className="flex justify-between items-center mt-1.5">
                              <span className="text-[10px] font-mono text-slate-400">SKU: {alert.sku}</span>
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                                {alert.stock} {alert.unit} left
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                </div>

                {/* 3. Master Inventory Table Listing Component */}
                <CatalogTable 
                  items={items} 
                  userRole={dbUser ? dbUser.role : 'staff'} 
                  token={token} 
                  onRefresh={loadWorkspaceData} 
                />

              </div>
            )}

            {activeTab === 'audit' && (
              <div className="space-y-6">
                {/* Printable and downloadable Trace Ledger */}
                <AuditLogTable movements={movements} />
              </div>
            )}

            {activeTab === 'users' && dbUser?.role === 'admin' && (
              <div className="space-y-6">
                {/* Users RBAC Panel */}
                <UserRoleManagement token={token} currentUserId={dbUser?.dbId} />
              </div>
            )}

          </div>

        </div>

      </main>

    </div>
  );
}
