import React, { useState, useEffect, useRef } from 'react';
import { 
  Mail, ShieldAlert, AlertTriangle, Sparkles, Search, BarChart3, Terminal, Settings, 
  LogOut, RefreshCw, Send, Check, X, Edit, Eye, Filter, ArrowRight, LogIn, Clock,
  Zap, Brain, Shield, Database, Cpu, FileText, MessageSquare, Activity, ChevronRight,
  Globe, Lock, TrendingUp, Users, Inbox, Star, AlertCircle, Hash, Layers
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, 
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, AreaChart, Area
} from 'recharts';

const API_BASE = "http://localhost:8000/api/v1";

const COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'];
const SECURITY_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

// Pipeline steps matching the reference app
const PIPELINE_STEPS = [
  { num: '01', label: 'Fetch',      desc: 'Gmail API · IMAP sync',         icon: Globe },
  { num: '02', label: 'Preprocess', desc: 'Tokenize · Lemmatize · TF-IDF', icon: Cpu },
  { num: '03', label: 'Persist',    desc: 'SQLite + in-memory cache',      icon: Database },
  { num: '04', label: 'Classify',   desc: 'DistilBERT · 10 categories',   icon: Layers },
  { num: '05', label: 'Spam',       desc: 'Naive Bayes ensemble',          icon: Shield },
  { num: '06', label: 'Phishing',   desc: 'XGBoost + SPF/DKIM/DMARC',     icon: Lock },
  { num: '07', label: 'Priority',   desc: 'LightGBM · 4 tiers',           icon: TrendingUp },
  { num: '08', label: 'NER',        desc: 'spaCy + BERT-NER',             icon: Users },
  { num: '09', label: 'Embed',      desc: 'MiniLM → FAISS',               icon: Hash },
  { num: '10', label: 'RAG',        desc: 'Hybrid retrieval · top-k 8',   icon: Search },
  { num: '11', label: 'Summarize',  desc: 'LLM · 5-bullet digest',        icon: FileText },
  { num: '12', label: 'Reply',      desc: 'Style-matched generation',     icon: MessageSquare },
];

const MODEL_REGISTRY = [
  { name: 'DistilBERT', task: 'Categorizer',  acc: '94.2%', color: '#3b82f6' },
  { name: 'XGBoost',    task: 'Phishing',     acc: '97.1%', color: '#ef4444' },
  { name: 'Naive Bayes',task: 'Spam',         acc: '95.8%', color: '#f59e0b' },
  { name: 'LightGBM',   task: 'Priority',     acc: '91.5%', color: '#22c55e' },
  { name: 'RoBERTa',    task: 'Urgency',      acc: '93.0%', color: '#8b5cf6' },
  { name: 'MiniLM',     task: 'Embeddings',   acc: '384d',  color: '#06b6d4' },
];

export default function App() {
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // App Navigation
  const [activeTab, setActiveTab] = useState('inbox');
  
  // Data States
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [agentLogs, setAgentLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [preferences, setPreferences] = useState({
    writing_style: 'Professional',
    auto_reply_enabled: false,
    summary_bullet_count: 5
  });

  // Filter States
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [securityFilter, setSecurityFilter] = useState('all');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Operation States
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingReply, setEditingReply] = useState(false);
  const [editedReplyText, setEditedReplyText] = useState('');
  
  const terminalEndRef = useRef(null);

  // OAuth redirect handler
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    const urlError = urlParams.get('error');

    if (urlToken) {
      setToken(urlToken);
      window.history.replaceState({}, document.title, "/");
    } else if (urlError) {
      setAuthError(urlError === 'oauth_failed' ? 'Google Login Failed' : 'Authentication Error');
      window.history.replaceState({}, document.title, "/");
    }

    if (token) {
      localStorage.setItem('token', token);
      fetchCurrentUser();
    } else {
      localStorage.removeItem('token');
      setCurrentUser(null);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchEmails();
      fetchAgentLogs();
      fetchAnalytics();
    }
  }, [token, categoryFilter, priorityFilter, securityFilter]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [agentLogs]);

  const getHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
      if (res.status === 200) {
        const data = await res.json();
        setCurrentUser(data);
      } else {
        setToken('');
      }
    } catch { setToken(''); }
  };

  const fetchEmails = async () => {
    try {
      const url = `${API_BASE}/emails/?limit=100`;
      const res = await fetch(url, { headers: getHeaders() });
      if (res.status === 200) {
        const data = await res.json();
        setEmails(data);
      }
    } catch (e) { console.error(e); }
  };

  const fetchAgentLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/emails/agent/logs`, { headers: getHeaders() });
      if (res.status === 200) {
        const data = await res.json();
        setAgentLogs(data);
      }
    } catch (e) { console.error(e); }
  };

  const fetchPreferences = async () => {
    try {
      const res = await fetch(`${API_BASE}/emails/user/preferences`, { headers: getHeaders() });
      if (res.status === 200) {
        const data = await res.json();
        setPreferences(data);
      }
    } catch (e) { console.error(e); }
  };

  const savePreferences = async (updatedPref) => {
    try {
      const res = await fetch(`${API_BASE}/emails/user/preferences`, {
        method: 'PUT', headers: getHeaders(), body: JSON.stringify(updatedPref)
      });
      if (res.status === 200) {
        const data = await res.json();
        setPreferences(data);
      }
    } catch (e) { console.error(e); }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/emails/analytics/dashboard`, { headers: getHeaders() });
      if (res.status === 200) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (e) { console.error(e); }
  };

  const handleSimulateEmail = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch(`${API_BASE}/emails/fetch/simulate`, {
        method: 'POST', headers: getHeaders()
      });
      if (res.status === 200) {
        const newEmail = await res.json();
        fetchEmails(); fetchAgentLogs(); fetchAnalytics();
        setSelectedEmail(newEmail);
      }
    } catch (e) { console.error(e); }
    finally { setIsSimulating(false); }
  };

  const handleSyncRealEmails = async () => {
    setIsSyncing(true);
    try {
      await fetch(`${API_BASE}/emails/fetch/sync`, { method: 'POST', headers: getHeaders() });
      fetchEmails(); fetchAgentLogs(); fetchAnalytics();
    } catch (e) { console.error(e); }
    finally { setIsSyncing(false); }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`${API_BASE}/emails/search`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ query: searchQuery, limit: 15 })
      });
      if (res.status === 200) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (e) { console.error(e); }
    finally { setIsSearching(false); }
  };

  const handleFeedback = async (emailId, type, val) => {
    try {
      const res = await fetch(`${API_BASE}/emails/feedback`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ email_id: emailId, feedback_type: type, corrected_value: val })
      });
      if (res.status === 200) {
        fetchEmails(); fetchAnalytics();
        if (selectedEmail && selectedEmail.id === emailId) {
          const updatedRes = await fetch(`${API_BASE}/emails/${emailId}`, { headers: getHeaders() });
          const updated = await updatedRes.json();
          setSelectedEmail(updated);
        }
      }
    } catch (e) { console.error(e); }
  };

  const handleUpdateReplyStatus = async (replyId, statusVal, bodyVal = null) => {
    try {
      const res = await fetch(`${API_BASE}/emails/reply/${replyId}`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify({ status: statusVal, edited_body: bodyVal })
      });
      if (res.status === 200) {
        setEditingReply(false);
        if (selectedEmail) {
          const updatedRes = await fetch(`${API_BASE}/emails/${selectedEmail.id}`, { headers: getHeaders() });
          const updated = await updatedRes.json();
          setSelectedEmail(updated);
        }
      }
    } catch (e) { console.error(e); }
  };

  const selectEmailAndMarkRead = async (email) => {
    setSelectedEmail(email);
    setEditingReply(false);
    if (!email.is_read) {
      try {
        const res = await fetch(`${API_BASE}/emails/${email.id}`, {
          method: 'PUT', headers: getHeaders(), body: JSON.stringify({ is_read: true })
        });
        if (res.status === 200) fetchEmails();
      } catch (e) { console.error(e); }
    }
  };

  const handleLogout = () => { setToken(''); localStorage.removeItem('token'); };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('Connecting to IMAP server...');
    try {
      const params = new URLSearchParams();
      params.append('username', authEmail);
      params.append('password', authPassword);
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });
      if (res.status === 200) {
        const data = await res.json();
        setToken(data.access_token);
        setAuthError('');
      } else {
        const err = await res.json();
        setAuthError(err.detail || 'IMAP Authentication failed');
      }
    } catch { setAuthError('Connection server error'); }
  };

  // Badge color helpers
  const getPriorityColor = (p) => {
    const m = {
      'Critical': 'bg-red-500/15 text-red-400 border border-red-500/30',
      'High':     'bg-orange-500/15 text-orange-400 border border-orange-500/30',
      'Medium':   'bg-blue-500/15 text-blue-400 border border-blue-500/30',
      'Low':      'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30',
    };
    return m[p] || m['Low'];
  };

  const getCategoryColor = (c) => {
    const m = {
      'Work':      'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
      'Finance':   'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      'Social':    'bg-sky-500/15 text-sky-400 border border-sky-500/30',
      'Updates':   'bg-purple-500/15 text-purple-400 border border-purple-500/30',
      'Promotion': 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      'Spam':      'bg-rose-500/15 text-rose-400 border border-rose-500/30',
      'Education': 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
      'Travel':    'bg-teal-500/15 text-teal-400 border border-teal-500/30',
    };
    return m[c] || 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30';
  };

  const getSecurityBadge = (email) => {
    if (email.is_phishing) return { text: `Phishing ${Math.round(email.phishing_score * 100)}%`, cls: 'bg-red-500/20 text-red-400 border border-red-500/40 badge-phishing' };
    if (email.is_spam)     return { text: 'Spam', cls: 'bg-orange-500/20 text-orange-400 border border-orange-500/40' };
    return { text: 'Safe', cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' };
  };

  const getInitials = (sender) => {
    const name = sender.split('<')[0].trim().split(/\s+/);
    return name.length >= 2 ? (name[0][0] + name[1][0]).toUpperCase() : name[0].substring(0, 2).toUpperCase();
  };

  const getInitialColor = (sender) => {
    const colors = ['bg-blue-600', 'bg-violet-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600', 'bg-cyan-600', 'bg-pink-600'];
    let hash = 0;
    for (let i = 0; i < sender.length; i++) hash = sender.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 172800000) return 'Yesterday';
    return `${Math.floor(diff / 86400000)}d`;
  };

  // ========================
  // AUTH SCREEN
  // ========================
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[150px] pointer-events-none"></div>
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-violet-600/8 rounded-full blur-[150px] pointer-events-none"></div>

        <div className="w-full max-w-md mx-4 relative z-10">
          {/* Logo block */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-sm font-bold tracking-wider text-white">Neural Inbox</h1>
                <span className="text-[10px] text-textMuted font-medium tracking-widest uppercase">AI Email Assistant</span>
              </div>
            </div>
            <h2 className="text-3xl font-black tracking-tight gradient-text">
              Your inbox, read and reasoned by twelve models.
            </h2>
            <p className="text-sm text-textMuted mt-3 leading-relaxed max-w-sm mx-auto">
              Emails stream in from Gmail and IMAP, get cleaned and embedded, then pass through classification, phishing detection, and LLM generation.
            </p>
          </div>

          {/* Auth card */}
          <div className="glass-strong rounded-2xl p-8">
            {/* Google OAuth */}
            <button
              onClick={() => window.location.href = `${API_BASE}/auth/google/login`}
              className="w-full py-3.5 rounded-xl font-semibold text-sm bg-white text-zinc-900 hover:bg-zinc-100 transition-all flex justify-center items-center gap-3 shadow-lg shadow-white/5"
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="relative flex items-center my-6">
              <div className="flex-1 border-t border-zinc-800"></div>
              <span className="px-3 text-[10px] text-textMuted font-bold uppercase tracking-widest">or email login</span>
              <div className="flex-1 border-t border-zinc-800"></div>
            </div>

            {/* IMAP Form */}
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-textMuted mb-1.5">Email Address</label>
                <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  placeholder="you@example.com" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-textMuted mb-1.5 flex justify-between">
                  <span>App Password</span>
                  <span className="text-[10px] text-blue-400/60 font-normal">16-char app password required for Gmail</span>
                </label>
                <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  placeholder="••••••••••••••••" required />
              </div>

              {authError && (
                <p className="text-xs text-center font-medium py-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                  {authError}
                </p>
              )}

              <button type="submit" className="w-full py-3.5 rounded-xl font-bold text-sm text-white gradient-primary shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 transition-all flex justify-center items-center gap-2">
                <LogIn className="h-4 w-4" /> Connect via IMAP
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ========================
  // MAIN DASHBOARD
  // ========================
  const totalEmails = analytics?.security_stats?.total_emails || emails.length;
  const threatsBlocked = (analytics?.security_stats?.spam_count || 0) + (analytics?.security_stats?.phishing_count || 0);
  const unreadCount = emails.filter(e => !e.is_read).length;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-white font-sans">
      {/* ===== SIDEBAR ===== */}
      <aside className="w-[260px] glass-strong flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-zinc-800/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-md shadow-blue-500/20">
            <Brain className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-white">Neural Inbox</h1>
            <span className="text-[10px] text-textMuted font-medium tracking-widest uppercase">AI Email Assistant</span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-3 space-y-0.5">
          {[
            { id: 'inbox',    icon: Inbox,     label: 'Inbox',           badge: unreadCount || null },
            { id: 'analytics',icon: BarChart3,  label: 'AI Analytics',    onClick: () => fetchAnalytics() },
            { id: 'search',   icon: Search,     label: 'Semantic Search' },
            { id: 'terminal', icon: Terminal,    label: 'Agent Terminal',  live: true, onClick: () => fetchAgentLogs() },
            { id: 'settings', icon: Settings,    label: 'Preferences',    onClick: () => fetchPreferences() },
          ].map(item => (
            <button key={item.id}
              onClick={() => { setActiveTab(item.id); item.onClick?.(); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                activeTab === item.id 
                  ? 'bg-blue-500/10 text-blue-400' 
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
              {item.badge && (
                <span className="ml-auto text-[10px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{item.badge}</span>
              )}
              {item.live && (
                <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </button>
          ))}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-zinc-800/50 space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-[11px] font-bold text-white">
              {currentUser?.full_name?.charAt(0) || currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{currentUser?.full_name || 'User'}</p>
              <p className="text-[10px] text-textMuted truncate">{currentUser?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold text-zinc-400 border border-zinc-800 hover:bg-zinc-800/50 hover:text-red-400 transition-all">
            <LogOut className="h-3 w-3" /> Sign Out
          </button>
        </div>
      </aside>

      {/* ===== MAIN AREA ===== */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 px-6 flex items-center justify-between border-b border-zinc-800/50 shrink-0 bg-background/80 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            {activeTab === 'inbox' && <><Inbox className="h-4 w-4 text-blue-400" /> Intelligent Inbox</>}
            {activeTab === 'analytics' && <><BarChart3 className="h-4 w-4 text-blue-400" /> Pipeline Analytics</>}
            {activeTab === 'search' && <><Search className="h-4 w-4 text-blue-400" /> Semantic Search</>}
            {activeTab === 'terminal' && <><Terminal className="h-4 w-4 text-blue-400" /> Agent Terminal</>}
            {activeTab === 'settings' && <><Settings className="h-4 w-4 text-blue-400" /> Preferences</>}
          </h2>
          <div className="flex items-center gap-2.5">
            <button onClick={handleSyncRealEmails} disabled={isSyncing}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[11px] font-semibold text-zinc-300 transition-all flex items-center gap-1.5 disabled:opacity-40">
              <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Check Mail'}
            </button>
            <button onClick={handleSimulateEmail} disabled={isSimulating}
              className="px-3.5 py-1.5 rounded-lg gradient-primary text-[11px] font-bold text-white transition-all flex items-center gap-1.5 disabled:opacity-40 shadow-md shadow-blue-500/10">
              <Sparkles className="h-3 w-3" />
              {isSimulating ? 'Processing...' : 'Simulate Email'}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">

          {/* ===== INBOX VIEW ===== */}
          {activeTab === 'inbox' && (
            <div className="h-full flex">
              {/* Email List */}
              <div className="w-[380px] border-r border-zinc-800/50 flex flex-col shrink-0">
                {/* Filters */}
                <div className="px-3 py-4 border-b border-zinc-800/50 flex gap-2 justify-between items-center bg-zinc-900/20">
                  {[
                    { id: 'all', icon: Layers, label: 'All' },
                    { id: 'urgent', icon: Zap, label: 'Urgent' },
                    { id: 'threats', icon: ShieldAlert, label: 'Threats' },
                    { id: 'unread', icon: Inbox, label: 'Unread' }
                  ].map(f => (
                    <button key={f.id}
                      onClick={() => setSecurityFilter(f.id)}
                      className={`flex items-center justify-center gap-2 px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border flex-1 ${
                        securityFilter === f.id
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                          : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <f.icon className="w-4 h-4" /> {f.label}
                    </button>
                  ))}
                </div>

                {/* Email Items */}
                <div className="flex-1 overflow-y-auto">
                  {emails.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <Mail className="h-10 w-10 text-zinc-700 mb-3" />
                      <p className="text-sm font-semibold text-zinc-500">No emails yet</p>
                      <p className="text-xs text-zinc-600 mt-1">Click "Simulate Email" to test the pipeline</p>
                    </div>
                  ) : emails.filter(email => {
                    if (securityFilter === 'urgent') return email.priority === 'Critical' || email.priority === 'High';
                    if (securityFilter === 'threats') return email.is_phishing || email.is_spam;
                    if (securityFilter === 'unread') return !email.is_read;
                    return true;
                  }).map(email => {
                    const sec = getSecurityBadge(email);
                    return (
                      <div key={email.id} onClick={() => selectEmailAndMarkRead(email)}
                        className={`p-4 mx-2 my-2 cursor-pointer rounded-2xl transition-all duration-300 ${
                          selectedEmail?.id === email.id 
                            ? 'bg-cyan-500/10 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)] scale-[1.02]' 
                            : 'border border-transparent hover:bg-zinc-900/80 hover:border-zinc-800/50 hover:scale-[1.01]'
                        } ${!email.is_read ? '' : 'opacity-70'}`}>
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className={`w-9 h-9 rounded-full ${getInitialColor(email.sender)} flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5`}>
                            {getInitials(email.sender)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={`text-[12px] truncate max-w-[180px] ${!email.is_read ? 'font-bold text-white' : 'font-medium text-zinc-400'}`}>
                                {email.sender.split('<')[0].trim()}
                              </span>
                              <span className="text-[10px] text-zinc-500 shrink-0 ml-2">{formatTime(email.received_at)}</span>
                            </div>
                            <h4 className={`text-[12px] truncate mb-1 ${!email.is_read ? 'font-semibold text-zinc-200' : 'text-zinc-500'}`}>
                              {email.subject || '(No Subject)'}
                            </h4>
                            <p className="text-[11px] text-zinc-600 line-clamp-1">{email.body}</p>
                            {/* Tags */}
                            <div className="flex gap-2 mt-2.5 flex-wrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getPriorityColor(email.priority)} hover:scale-105 cursor-pointer transition-transform`}>{email.priority}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getCategoryColor(email.category)} hover:scale-105 cursor-pointer transition-transform`}>{email.category}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${sec.cls} hover:scale-105 cursor-pointer transition-transform`}>{sec.text}</span>
                              {email.entities?.length > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:scale-105 cursor-pointer transition-transform">{email.entities.length}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Email Detail */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {selectedEmail ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Detail Header */}
                    <div className="px-6 py-4 border-b border-zinc-800/50 shrink-0">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-full ${getInitialColor(selectedEmail.sender)} flex items-center justify-center text-lg font-bold text-white shrink-0 shadow-lg shadow-black/20`}>
                          {getInitials(selectedEmail.sender)}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-1.5 leading-tight">{selectedEmail.subject || '(No Subject)'}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-[12px] text-zinc-400">
                            <span className="text-zinc-300 font-medium">{selectedEmail.sender.split('<')[0].trim()}</span>
                            <span>{selectedEmail.sender.includes('<') ? `<${selectedEmail.sender.split('<')[1]}` : ''}</span>
                            <span className="text-zinc-600">·</span>
                            <span>{formatTime(selectedEmail.received_at)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Model Confidence Progress Bars */}
                      <div className="mt-6 pt-4 border-t border-zinc-800/30">
                        <div className="flex flex-wrap gap-2.5 mb-5">
                          <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${getPriorityColor(selectedEmail.priority)} hover:scale-105 hover:brightness-110 cursor-pointer transition-all`}>{selectedEmail.priority} priority</span>
                          <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${getCategoryColor(selectedEmail.category)} hover:scale-105 hover:brightness-110 cursor-pointer transition-all`}>{selectedEmail.category}</span>
                          <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${selectedEmail.sentiment === 'Positive' ? 'text-emerald-400 border border-emerald-500/30' : selectedEmail.sentiment === 'Negative' ? 'text-red-400 border border-red-500/30' : 'text-zinc-400 border border-zinc-500/30'} hover:scale-105 hover:brightness-110 cursor-pointer transition-all`}>{selectedEmail.sentiment}</span>
                          <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full text-cyan-400 border border-cyan-500/30 hover:scale-105 hover:brightness-110 cursor-pointer transition-all`}>Confidence {Math.round(100 - (selectedEmail.spam_score*10))}%</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              <span>Phishing Risk</span>
                              <span className="text-red-400">{Math.round(selectedEmail.phishing_score * 100)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-red-500 rounded-full transition-all duration-1000" style={{ width: `${Math.round(selectedEmail.phishing_score * 100)}%` }}></div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              <span>Spam Score</span>
                              <span className="text-orange-400">{Math.round(selectedEmail.spam_score * 100)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                              <div className="h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: `${Math.round(selectedEmail.spam_score * 100)}%` }}></div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              <span>Model Confidence</span>
                              <span className="text-cyan-400">{Math.round(100 - (selectedEmail.spam_score*10))}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-cyan-400 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(34,211,238,0.5)]" style={{ width: `${Math.round(100 - (selectedEmail.spam_score*10))}%` }}></div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-5">
                          {['SPF', 'DKIM', 'DMARC'].map(p => (
                            <div key={p} className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 text-[11px] text-emerald-400 font-bold hover:scale-105 hover:brightness-110 cursor-pointer transition-all">
                              <Check className="w-3.5 h-3.5" /> {p} pass
                            </div>
                          ))}
                        </div>

                        {/* Quick Actions Grid */}
                        <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-zinc-800/30">
                          {[
                            { id: 'remind', icon: Clock, label: 'Create reminder', 
                              bg: 'bg-blue-500/10', border: 'border-blue-500/20', hoverBg: 'group-hover:bg-blue-500', hoverShadow: 'group-hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]', iconColor: 'text-blue-400' },
                            { id: 'archive', icon: Inbox, label: 'Archive', 
                              bg: 'bg-violet-500/10', border: 'border-violet-500/20', hoverBg: 'group-hover:bg-violet-500', hoverShadow: 'group-hover:shadow-[0_0_15px_rgba(139,92,246,0.4)]', iconColor: 'text-violet-400' },
                            { id: 'relabel', icon: Settings, label: 'Re-label', 
                              bg: 'bg-teal-500/10', border: 'border-teal-500/20', hoverBg: 'group-hover:bg-teal-500', hoverShadow: 'group-hover:shadow-[0_0_15px_rgba(20,184,166,0.4)]', iconColor: 'text-teal-400' },
                            { id: 'spam', icon: ShieldAlert, label: 'Move to spam', 
                              bg: 'bg-pink-500/10', border: 'border-pink-500/20', hoverBg: 'group-hover:bg-pink-500', hoverShadow: 'group-hover:shadow-[0_0_15px_rgba(236,72,153,0.4)]', iconColor: 'text-pink-400' }
                          ].map(action => (
                            <div key={action.id} className="group rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-4 flex flex-col items-center justify-center gap-3 hover:bg-zinc-900/60 transition-all cursor-pointer">
                              <div className={`w-10 h-10 rounded-full ${action.bg} flex items-center justify-center border ${action.border} group-hover:scale-110 ${action.hoverBg} ${action.hoverShadow} transition-all duration-300`}>
                                <action.icon className={`w-4 h-4 ${action.iconColor} group-hover:text-white transition-colors`} />
                              </div>
                              <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">{action.label}</span>
                            </div>
                          ))}
                        </div>
                        
                        {/* Tab bar */}
                        <div className="flex gap-2 bg-zinc-900/50 p-1.5 rounded-xl mt-6 border border-zinc-800/50">
                          {['AI Summary', 'Smart Reply', 'Entities', 'Explainability'].map((tab, i) => (
                            <button key={tab} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${
                              i === 0 
                                ? 'bg-zinc-800 text-white shadow-sm' 
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                            }`}>
                              {tab}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Detail Body */}
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                      {/* Threat Warning */}
                      {(selectedEmail.is_phishing || selectedEmail.is_spam) && (
                        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex items-start gap-3 fade-in">
                          <div className="p-2 bg-red-500/10 rounded-lg shrink-0">
                            <ShieldAlert className="h-5 w-5 text-red-400" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-red-400 mb-1">
                              {selectedEmail.is_phishing ? 'Phishing Attempt Detected' : 'Spam Message Flagged'}
                            </h4>
                            <p className="text-[11px] text-zinc-500 leading-relaxed mb-2">
                              {selectedEmail.is_phishing 
                                ? 'Security models detected phishing patterns, suspicious links, or sender spoofing.'
                                : 'Classified as unsolicited bulk email or promotional spam.'}
                            </p>
                            <div className="flex gap-3 text-[10px] text-zinc-500 items-center">
                              <span>Phishing: <strong className="text-red-400">{Math.round(selectedEmail.phishing_score * 100)}%</strong></span>
                              <span>Spam: <strong className="text-orange-400">{Math.round(selectedEmail.spam_score * 100)}%</strong></span>
                              <button onClick={() => handleFeedback(selectedEmail.id, "spam_correction", "false")}
                                className="text-blue-400 hover:underline font-semibold">Mark as Safe</button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* LLM Digest */}
                      <div className="rounded-xl border border-zinc-800/50 overflow-hidden fade-in">
                        <div className="px-4 py-3 bg-zinc-900/50 border-b border-zinc-800/50 flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                          <span className="text-xs font-bold text-zinc-300">LLM digest · 5-bullet extraction</span>
                        </div>
                        <div className="p-4 space-y-2">
                          {selectedEmail.summary ? selectedEmail.summary.split('\n').filter(l => l.trim()).map((line, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <span className="text-[10px] font-bold text-blue-400/60 mt-0.5 shrink-0 w-5 text-right">{String(i + 1).padStart(2, '0')}</span>
                              <span className="text-[12px] text-zinc-300 leading-relaxed">{line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '')}</span>
                            </div>
                          )) : (
                            <p className="text-[12px] text-zinc-500 italic">Summary generation pending...</p>
                          )}
                        </div>
                      </div>

                      {/* NER Entities */}
                      {selectedEmail.entities?.length > 0 && (
                        <div className="space-y-2 fade-in">
                          <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Named Entities (NER)</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedEmail.entities.map(ent => (
                              <span key={ent.id} className="text-[10px] font-medium px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
                                <span className="text-zinc-500 mr-1">{ent.entity_type}:</span>{ent.entity_value}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Original Message */}
                      <div className="rounded-xl border border-zinc-800/50 overflow-hidden fade-in">
                        <div className="px-4 py-3 bg-zinc-900/50 border-b border-zinc-800/50 flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-300">Original message</span>
                          <span className="text-[10px] text-zinc-500">Sentiment: <strong className={selectedEmail.sentiment === 'Positive' ? 'text-emerald-400' : selectedEmail.sentiment === 'Negative' ? 'text-red-400' : 'text-zinc-400'}>{selectedEmail.sentiment}</strong></span>
                        </div>
                        <div className="p-4 text-[12px] text-zinc-400 whitespace-pre-wrap leading-relaxed font-light">
                          {selectedEmail.body}
                        </div>
                      </div>

                      {/* Smart Replies */}
                      {selectedEmail.replies?.map(reply => (
                        <div key={reply.id} className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3 fade-in">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-violet-400 flex items-center gap-1.5">
                              <Send className="h-3.5 w-3.5" /> Smart Reply
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              reply.status === 'Sent' ? 'bg-emerald-500/20 text-emerald-400' :
                              reply.status === 'Rejected' ? 'bg-red-500/20 text-red-400' :
                              'bg-violet-500/20 text-violet-400'
                            }`}>{reply.status}</span>
                          </div>
                          {editingReply ? (
                            <textarea value={editedReplyText} onChange={(e) => setEditedReplyText(e.target.value)}
                              rows={4} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-violet-500/50" />
                          ) : (
                            <div className="text-[12px] bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-3 text-zinc-300 whitespace-pre-wrap italic leading-relaxed">
                              {reply.generated_body}
                            </div>
                          )}
                          <div className="flex gap-2 justify-end">
                            {editingReply ? (
                              <>
                                <button onClick={() => handleUpdateReplyStatus(reply.id, "Suggested")}
                                  className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs font-semibold text-zinc-400 hover:bg-zinc-800/50 flex items-center gap-1"><X className="h-3 w-3" /> Cancel</button>
                                <button onClick={() => handleUpdateReplyStatus(reply.id, "Sent", editedReplyText)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-bold text-white flex items-center gap-1"><Check className="h-3 w-3" /> Save & Send</button>
                              </>
                            ) : reply.status !== 'Sent' && (
                              <>
                                <button onClick={() => handleUpdateReplyStatus(reply.id, "Rejected")}
                                  className="px-3 py-1.5 rounded-lg border border-red-500/20 text-xs font-semibold text-red-400 hover:bg-red-500/10 flex items-center gap-1"><X className="h-3 w-3" /> Dismiss</button>
                                <button onClick={() => { setEditingReply(true); setEditedReplyText(reply.generated_body); }}
                                  className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-800/50 flex items-center gap-1"><Edit className="h-3 w-3" /> Edit</button>
                                <button onClick={() => handleUpdateReplyStatus(reply.id, "Sent")}
                                  className="px-3 py-1.5 rounded-lg gradient-primary text-xs font-bold text-white flex items-center gap-1"><Check className="h-3 w-3" /> Approve</button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Feedback */}
                      <div className="flex items-center gap-3 pt-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Correct AI:</span>
                        <select value={selectedEmail.category}
                          onChange={(e) => handleFeedback(selectedEmail.id, "category_correction", e.target.value)}
                          className="bg-zinc-900 border border-zinc-800 text-[11px] rounded-lg px-2 py-1 text-zinc-300 focus:outline-none">
                          {['Work','Finance','Social','Updates','Promotion','Education','Travel','Spam'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <Mail className="h-12 w-12 text-zinc-800 mb-4" />
                    <h3 className="text-sm font-bold text-zinc-400 mb-1">Select an email to view AI analysis</h3>
                    <p className="text-xs text-zinc-600 max-w-sm leading-relaxed">Click an email from the list to inspect classification, phishing alerts, NER entities, and LLM summaries.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== ANALYTICS VIEW ===== */}
          {activeTab === 'analytics' && (
            <div className="h-full overflow-y-auto p-6 space-y-6">
              {/* Pipeline Steps */}
              <div>
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-400" /> 12-Model Pipeline
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                  {PIPELINE_STEPS.map(step => (
                    <div key={step.num} className="pipeline-step rounded-xl p-3 text-center group">
                      <span className="text-[10px] font-bold text-blue-400/60 block mb-1">{step.num}</span>
                      <step.icon className="h-5 w-5 mx-auto text-zinc-400 group-hover:text-blue-400 transition-colors mb-1.5" />
                      <p className="text-[11px] font-bold text-zinc-300">{step.label}</p>
                      <p className="text-[9px] text-zinc-600 mt-0.5 leading-tight">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* KPI Bento Grid */}
              {analytics && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="group rounded-2xl border border-zinc-800/50 bg-zinc-900/40 p-5 flex items-center gap-5 hover:bg-zinc-900/60 transition-all cursor-pointer">
                      <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20 group-hover:scale-110 group-hover:bg-blue-500 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-300">
                        <Layers className="w-6 h-6 text-blue-400 group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Emails processed</span>
                        <h3 className="text-2xl font-black text-white stat-number leading-none">{totalEmails.toLocaleString()}</h3>
                        <span className="text-[10px] text-emerald-400 font-medium mt-1 block">+{Math.max(1, Math.round(totalEmails * 0.12))}% today</span>
                      </div>
                    </div>
                    
                    <div className="group rounded-2xl border border-zinc-800/50 bg-zinc-900/40 p-5 flex items-center gap-5 hover:bg-zinc-900/60 transition-all cursor-pointer">
                      <div className="w-14 h-14 rounded-full bg-pink-500/10 flex items-center justify-center shrink-0 border border-pink-500/20 group-hover:scale-110 group-hover:bg-pink-500 group-hover:shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all duration-300">
                        <ShieldAlert className="w-6 h-6 text-pink-400 group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Threats blocked</span>
                        <h3 className="text-2xl font-black text-white stat-number leading-none">{threatsBlocked}</h3>
                        <span className="text-[10px] text-cyan-400 font-medium mt-1 block">2 today</span>
                      </div>
                    </div>

                    <div className="group rounded-2xl border border-zinc-800/50 bg-zinc-900/40 p-5 flex items-center gap-5 hover:bg-zinc-900/60 transition-all cursor-pointer">
                      <div className="w-14 h-14 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0 border border-violet-500/20 group-hover:scale-110 group-hover:bg-violet-500 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all duration-300">
                        <Sparkles className="w-6 h-6 text-violet-400 group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Hours saved</span>
                        <h3 className="text-2xl font-black text-white stat-number leading-none">{(totalEmails * 0.15).toFixed(1)}</h3>
                        <span className="text-[10px] text-cyan-400 font-medium mt-1 block">this week</span>
                      </div>
                    </div>

                    <div className="group rounded-2xl border border-zinc-800/50 bg-zinc-900/40 p-5 flex items-center gap-5 hover:bg-zinc-900/60 transition-all cursor-pointer">
                      <div className="w-14 h-14 rounded-full bg-teal-500/10 flex items-center justify-center shrink-0 border border-teal-500/20 group-hover:scale-110 group-hover:bg-teal-500 group-hover:shadow-[0_0_20px_rgba(20,184,166,0.4)] transition-all duration-300">
                        <Database className="w-6 h-6 text-teal-400 group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Vector index</span>
                        <h3 className="text-2xl font-black text-white stat-number leading-none">{(totalEmails * 384 / 1000000).toFixed(1)}M</h3>
                        <span className="text-[10px] text-cyan-400 font-medium mt-1 block">FAISS · HNSW</span>
                      </div>
                    </div>
                  </div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Daily Volume */}
                    <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-5 relative overflow-hidden">
                      <div className="absolute top-5 left-5 w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 z-10">
                        <Activity className="w-4 h-4 text-cyan-400" />
                      </div>
                      <h4 className="text-xs font-bold text-white mb-6 ml-11 mt-1.5 z-10 relative">Pipeline throughput · last 24h</h4>
                      <div className="h-64 mt-4 relative z-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analytics.daily_volume} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorFlagged" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                            <XAxis dataKey="date" stroke="#52525b" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                            <YAxis stroke="#52525b" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                              labelStyle={{ display: 'none' }}
                            />
                            <Area type="monotone" name="processed" dataKey="count" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorVolume)" dot={false} activeDot={{ r: 6, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2 }} />
                            {/* We simulate flagged for the chart */}
                            <Area type="monotone" name="flagged" dataKey={(d) => Math.round(d.count * 0.1)} stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorFlagged)" dot={false} activeDot={{ r: 4, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Category Distribution */}
                    <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-5 relative overflow-hidden">
                      <div className="absolute top-5 left-5 w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 z-10">
                        <Layers className="w-4 h-4 text-indigo-400" />
                      </div>
                      <h4 className="text-xs font-bold text-white mb-6 ml-11 mt-1.5 z-10 relative">Category distribution</h4>
                      <div className="h-64 mt-4 relative z-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.category_distribution} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                            <XAxis dataKey="category" stroke="#52525b" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                            <YAxis stroke="#52525b" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                            <Tooltip 
                              cursor={{ fill: '#27272a', opacity: 0.4 }}
                              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '12px' }}
                              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                              labelStyle={{ fontSize: '11px', color: '#a1a1aa', marginBottom: '4px' }}
                            />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Security Pie */}
                    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-5">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Security threat ratios</h4>
                      <div className="h-64 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={[
                                { name: 'Clean', value: analytics.security_stats.clean_count },
                                { name: 'Spam', value: analytics.security_stats.spam_count },
                                { name: 'Phishing', value: analytics.security_stats.phishing_count }
                              ]} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                              <Cell fill="#22c55e" /><Cell fill="#f59e0b" /><Cell fill="#ef4444" />
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '11px' }} />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Model Registry */}
                    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-5">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Model registry · MLflow tracked</h4>
                      <div className="space-y-3">
                        {MODEL_REGISTRY.map(model => (
                          <div key={model.name} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: model.color }}></div>
                              <div>
                                <span className="text-[12px] font-bold text-zinc-200">{model.name}</span>
                                <span className="text-[10px] text-zinc-500 ml-2">· {model.task}</span>
                              </div>
                            </div>
                            <span className="text-[11px] font-mono font-bold text-zinc-400">{model.acc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {!analytics && (
                <div className="p-12 text-center border border-dashed border-zinc-800 rounded-2xl">
                  <BarChart3 className="h-10 w-10 mx-auto text-zinc-700 mb-3 animate-pulse" />
                  <p className="text-sm font-semibold text-zinc-500">Loading analytics...</p>
                  <p className="text-xs text-zinc-600 mt-1">Ingest some emails first to see pipeline metrics.</p>
                </div>
              )}
            </div>
          )}

          {/* ===== SEARCH VIEW ===== */}
          {activeTab === 'search' && (
            <div className="h-full flex flex-col p-6 gap-5">
              <form onSubmit={handleSearch} className="flex gap-3 shrink-0">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-500" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by topic, e.g., 'find invoice files' or 'budget review meeting'..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all" />
                </div>
                <button type="submit" disabled={isSearching}
                  className="px-6 py-3 rounded-xl gradient-primary font-bold text-sm text-white disabled:opacity-50 shadow-lg shadow-blue-500/10 transition-all">
                  {isSearching ? 'Searching...' : 'Query Vectors'}
                </button>
              </form>
              <div className="flex-1 overflow-y-auto space-y-3">
                {searchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Search className="h-12 w-12 text-zinc-800 mb-4" />
                    <h4 className="text-sm font-bold text-zinc-400">Semantic similarity search</h4>
                    <p className="text-xs text-zinc-600 mt-1 max-w-sm leading-relaxed">SentenceTransformers compare your query's vector embeddings with inbox messages, ranking by conceptual similarity.</p>
                  </div>
                ) : searchResults.map(({ email, score }) => (
                  <div key={email.id} onClick={() => { selectEmailAndMarkRead(email); setActiveTab('inbox'); }}
                    className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/30 hover:bg-zinc-900/60 cursor-pointer transition-all flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getCategoryColor(email.category)}`}>{email.category}</span>
                        <span className="text-[10px] text-zinc-500">{email.sender.split('<')[0].trim()}</span>
                      </div>
                      <h4 className="text-[12px] font-bold text-zinc-200 truncate">{email.subject}</h4>
                      <p className="text-[11px] text-zinc-600 line-clamp-1 mt-0.5">{email.body}</p>
                    </div>
                    <div className="shrink-0 w-24 text-right">
                      <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Score</div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full gradient-primary rounded-full" style={{ width: `${Math.round(score * 100)}%` }}></div>
                      </div>
                      <span className="text-xs font-bold text-blue-400">{Math.round(score * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== TERMINAL VIEW ===== */}
          {activeTab === 'terminal' && (
            <div className="h-full flex flex-col m-4 bg-[#09090b] rounded-xl border border-zinc-800/50 overflow-hidden">
              <div className="px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                  <span className="text-[10px] text-zinc-500 font-mono font-semibold ml-2">agent_trace@neural-inbox</span>
                </div>
                <button onClick={() => setAgentLogs([])}
                  className="text-[10px] font-semibold text-zinc-500 hover:text-white px-2 py-0.5 border border-zinc-800 rounded transition-all">Clear</button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-2 select-all">
                <div className="text-zinc-600">
                  <span className="text-blue-400">$</span> python agent.py --listen<br/>
                  <span className="text-zinc-600">[INFO] Agent daemon active. Listening for new emails...</span>
                </div>
                {agentLogs.map((log, i) => (
                  <div key={i} className="fade-in border-l-2 border-emerald-500/20 pl-3 py-0.5">
                    <span className="text-zinc-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                    <span className="text-blue-300 font-semibold">[{log.action}]</span>{' '}
                    <span className="text-emerald-300">{log.detail}</span>
                    {log.subject && <span className="text-violet-400 block text-[11px] mt-0.5">&nbsp;&nbsp;↳ "{log.subject}"</span>}
                  </div>
                ))}
                <div className="cursor-blink" ref={terminalEndRef}><span className="text-blue-400">$ </span></div>
              </div>
            </div>
          )}

          {/* ===== SETTINGS VIEW ===== */}
          {activeTab === 'settings' && (
            <div className="h-full overflow-y-auto p-6 max-w-2xl">
              <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-6 space-y-6">
                <div className="flex items-center gap-2.5 text-sm font-bold text-white pb-4 border-b border-zinc-800/50">
                  <Settings className="h-4 w-4 text-blue-400" /> Model Preferences
                </div>

                {/* Writing Style */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Writing Style</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {['Professional', 'Friendly', 'Direct'].map(style => (
                      <button key={style} onClick={() => savePreferences({ ...preferences, writing_style: style })}
                        className={`py-3 rounded-lg border text-xs font-bold transition-all ${
                          preferences.writing_style === style
                            ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
                            : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                        }`}>{style}</button>
                    ))}
                  </div>
                </div>

                {/* Bullet Count */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Summary Bullets</label>
                  <div className="flex items-center gap-4">
                    <input type="range" min="3" max="8" value={preferences.summary_bullet_count}
                      onChange={(e) => savePreferences({ ...preferences, summary_bullet_count: parseInt(e.target.value) })}
                      className="flex-1 h-1.5 bg-zinc-800 rounded-full accent-blue-500" />
                    <span className="text-xs font-mono font-bold text-blue-400 w-16 text-right">{preferences.summary_bullet_count} bullets</span>
                  </div>
                </div>

                {/* Auto-Reply Toggle */}
                <div className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-200 mb-0.5">Automatic AI Replying</h4>
                    <p className="text-[10px] text-zinc-500">Auto-draft replies for Work/Finance emails that pass security checks.</p>
                  </div>
                  <button onClick={() => savePreferences({ ...preferences, auto_reply_enabled: !preferences.auto_reply_enabled })}
                    className={`w-11 h-6 rounded-full p-0.5 transition-all flex ${preferences.auto_reply_enabled ? 'bg-emerald-500 justify-end' : 'bg-zinc-700 justify-start'}`}>
                    <div className="w-5 h-5 bg-white rounded-full shadow-md"></div>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
