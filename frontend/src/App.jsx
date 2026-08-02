import React, { useState, useEffect, useRef } from 'react';
import { 
  Mail, ShieldAlert, Bell, Calendar, ListTodo, FileText, AlertTriangle, Sparkles, Search, BarChart3, Terminal, Settings, 
  LogOut, RefreshCw, Send, Check, X, Edit, Eye, Filter, ArrowRight, LogIn, Clock,
  Zap, Brain, Shield, Database, Cpu, MessageSquare, Activity, ChevronRight,
  Globe, Lock, TrendingUp, Users, Inbox, Star, AlertCircle, Hash, Layers, Plus,
  Info, CheckCircle2
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, 
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, AreaChart, Area
} from 'recharts';

const API_BASE = "http://127.0.0.1:8000/api/v1";

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

const cleanEmailBody = (body) => {
  if (!body) return '';
  
  // Replace <URL> with just the URL (removing angle brackets)
  let cleaned = body.replace(/<(https?:\/\/[^>]+)>/g, '$1');
  
  // Find all URLs and truncate them if they are too long
  cleaned = cleaned.replace(/(https?:\/\/[^\s]+)/g, (url) => {
    if (url.length > 50) {
      return url.substring(0, 47) + '...';
    }
    return url;
  });
  
  // Clean up multiple consecutive empty lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
};

export default function App() {
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isGoogleConnecting, setIsGoogleConnecting] = useState(false);
  const [isImapConnecting, setIsImapConnecting] = useState(false);
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
  const [emailSourceFilter, setEmailSourceFilter] = useState('real'); // 'real' | 'simulated'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sortCategory, setSortCategory] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [securityFilter, setSecurityFilter] = useState('all');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchDebounceRef = useRef(null);

  // Operation States
  const [isSimulating, setIsSimulating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDummyMenuOpen, setIsDummyMenuOpen] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingReply, setEditingReply] = useState(false);
  const [editedReplyText, setEditedReplyText] = useState('');
  const [detailTab, setDetailTab] = useState('Original Message');
  const [bulletCount, setBulletCount] = useState(5);
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  // Alert & Digest States
  const [alerts, setAlerts] = useState([]);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDigestModal, setShowDigestModal] = useState(false);
  const [dailyDigest, setDailyDigest] = useState(null);

  // --- Notification Logic ---
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [testDeliveryStatus, setTestDeliveryStatus] = useState('');
  
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notification');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const sendBrowserNotification = (title, body) => {
    setTestDeliveryStatus('Requested');
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/vite.svg' });
        setTestDeliveryStatus('Displayed');
      } catch (e) {
        setTestDeliveryStatus('Failed');
        console.error('Notification failed:', e);
      }
    } else {
      setTestDeliveryStatus('Failed (No Permission)');
    }
  };
  
  const handleTestNotification = () => {
    if (notificationPermission !== 'granted') {
      requestNotificationPermission().then(() => {
        if (Notification.permission === 'granted') {
          sendBrowserNotification('Neural Inbox Test', 'Notifications are configured correctly.');
        }
      });
    } else {
      sendBrowserNotification('Neural Inbox Test', 'Notifications are configured correctly.');
    }
  };

  const [alertKeywords, setAlertKeywords] = useState('');
  const [alertCategories, setAlertCategories] = useState('');

  const handleRegenerateSummary = async (count) => {
    if (!selectedEmail) return;
    setIsRegenerating(true);
    setBulletCount(count);
    try {
      const res = await fetch(`${API_BASE}/emails/${selectedEmail.id}/summary`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ bullet_count: count })
      });
      if (res.status === 200) {
        const data = await res.json();
        setSelectedEmail(data);
        setEmails(emails.map(e => e.id === data.id ? data : e));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRegenerating(false);
    }
  };
  
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
    if (!currentUser) return;
    fetchEmails();
    fetchAnalytics();
    
    // Polling for real-time dashboard updates — skip email refresh when user is searching
    const pollInterval = setInterval(() => {
      if (!isSearchActive) fetchEmails();
      fetchAnalytics();
    }, 8000);

    return () => clearInterval(pollInterval);
  }, [currentUser, isSearchActive]);

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

    const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE}/emails/alerts`, { headers: getHeaders() });
      if (res.status === 200) {
        const newAlerts = await res.json();
        // Check for newly generated unread alerts
        if (alerts.length > 0 && newAlerts.length > 0) {
            const latestNew = newAlerts[0];
            const latestOld = alerts[0];
            if (latestNew.id !== latestOld.id && !latestNew.is_read) {
               sendBrowserNotification(`Neural Inbox: ${latestNew.title}`, latestNew.message);
            }
        }
        setAlerts(newAlerts);
      }
    } catch (e) { console.error(e); }
  };

  const fetchDigest = async () => {
    try {
      setShowDigestModal(true);
      setDailyDigest(null);
      const res = await fetch(`${API_BASE}/emails/digest`, { headers: getHeaders() });
      if (res.status === 200) {
        const data = await res.json();
        setDailyDigest(data.digest);
      }
    } catch (e) { console.error(e); }
  };
  
  const saveAlertPreferences = async () => {
    try {
      const res = await fetch(`${API_BASE}/preferences`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          ...preferences,
          alert_keywords: JSON.stringify(alertKeywords.split(',').map(s => s.trim()).filter(Boolean)),
          alert_categories: JSON.stringify(alertCategories.split(',').map(s => s.trim()).filter(Boolean))
        })
      });
      if (res.status === 200) {
        alert('Alert preferences saved successfully!');
        setShowSettingsModal(false);
      }
    } catch (e) { console.error(e); }
  };
  
  useEffect(() => {
    if (token && currentUser) {
      fetchAlerts();
    }
  }, [token, currentUser]);

  const fetchEmails = async () => {
    try {
      const url = `${API_BASE}/emails/?limit=1000`;
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

  const handleSimulateEmail = async (type = 'random') => {
    setIsSimulating(true);
    setIsDummyMenuOpen(false);
    try {
      const res = await fetch(`${API_BASE}/emails/fetch/simulate?type=${type}`, {
        method: 'POST', headers: getHeaders()
      });
      if (res.status === 200) {
        const newEmail = await res.json();
        setEmailSourceFilter('simulated');
        fetchEmails(); fetchAgentLogs(); fetchAnalytics();
        setSelectedEmail(newEmail);
      }
    } catch (e) { console.error(e); }
    finally { setIsSimulating(false); }
  };

  const triggerSyncAPI = async () => {
    try {
      const res = await fetch(`${API_BASE}/emails/fetch/sync`, { method: 'POST', headers: getHeaders() });
      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.detail || "Failed to start sync. Please verify your email connection.");
        setIsSyncing(false);
        return;
      }
      setEmailSourceFilter('real');
    } catch (e) { 
      console.error(e); 
      setIsSyncing(false);
    }
  };

  const handleStopSync = async () => {
    setIsSyncing(false);
    try {
      await fetch(`${API_BASE}/emails/fetch/sync/stop`, { method: 'POST', headers: getHeaders() });
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (!isSyncing) return;
    
    // Trigger immediately when turned on
    triggerSyncAPI();
    
    // Then poll every 15 seconds
    const interval = setInterval(() => {
      triggerSyncAPI();
    }, 15000);
    
    return () => clearInterval(interval);
  }, [isSyncing]);

  const handleRefreshSimulations = async () => {
    setIsRefreshing(true);
    try {
      await fetch(`${API_BASE}/emails/fetch/simulate/clear`, { method: 'POST', headers: getHeaders() });
      await Promise.all([fetchEmails(), fetchAgentLogs(), fetchAnalytics()]);
    } catch (e) {
      console.error('Clear failed:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const doSearch = async (query) => {
    if (!query.trim()) {
      setIsSearchActive(false);
      setSearchResults([]);
      setSearchSuggestions([]);
      setShowSuggestions(false);
      setActiveTab('inbox');
      return;
    }
    setIsSearching(true);
    setIsSearchActive(true);
    setActiveTab('search');
    try {
      const res = await fetch(`${API_BASE}/emails/search`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ query, limit: 25 })
      });
      if (res.status === 200) {
        const data = await res.json();
        setSearchResults(data);
        // Build suggestions from results
        const suggestions = [];
        data.slice(0, 5).forEach(item => {
          const senderName = item.email.sender.split('<')[0].trim();
          if (senderName && !suggestions.includes(senderName)) suggestions.push(senderName);
          if (item.email.subject && !suggestions.includes(item.email.subject)) suggestions.push(item.email.subject.slice(0, 60));
        });
        setSearchSuggestions(suggestions.slice(0, 6));
        setShowSuggestions(false);
      }
    } catch (e) { console.error(e); }
    finally { setIsSearching(false); }
  };

  const handleSearch = () => doSearch(searchQuery);

  // Live debounced search as user types (Gmail-style)
  const handleSearchInput = (value) => {
    setSearchQuery(value);
    if (!value.trim()) {
      setIsSearchActive(false);
      setSearchResults([]);
      setSearchSuggestions([]);
      setShowSuggestions(false);
      setActiveTab('inbox');
      return;
    }
    setShowSuggestions(true);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/emails/search`, {
          method: 'POST', headers: getHeaders(),
          body: JSON.stringify({ query: value, limit: 6 })
        });
        if (res.status === 200) {
          const data = await res.json();
          const suggestions = [];
          data.forEach(item => {
            const senderName = item.email.sender.split('<')[0].trim();
            if (senderName && !suggestions.includes(senderName)) suggestions.push(senderName);
            if (item.email.subject && !suggestions.includes(item.email.subject)) suggestions.push(item.email.subject.slice(0, 60));
          });
          setSearchSuggestions(suggestions.slice(0, 6));
        }
      } catch (e) { console.error(e); }
    }, 350);
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

  const handleUpdateReplyStatus = async (replyId, statusVal, bodyVal = null, toneVal = null, lengthVal = null) => {
    try {
      const payload = { status: statusVal };
      if (bodyVal) payload.edited_body = bodyVal;
      if (toneVal) payload.tone = toneVal;
      if (lengthVal) payload.length_preference = lengthVal;
      
      const res = await fetch(`${API_BASE}/emails/reply/${replyId}`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify(payload)
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

  const handleRegenerateReply = async (replyId, toneVal, lengthVal) => {
    try {
      const res = await fetch(`${API_BASE}/emails/reply/${replyId}/regenerate`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ status: "Suggested", tone: toneVal, length_preference: lengthVal })
      });
      if (res.status === 200) {
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
    setIsImapConnecting(true);
    setAuthError('Connecting to backend (models are loading, this might take 15s)...');
    try {
      const fetchWithRetry = async (url, options = {}, retries = 10, delay = 2000) => {
        for (let i = 0; i < retries; i++) {
          try {
            const res = await fetch(url, options);
            return res;
          } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, delay));
          }
        }
      };
      
      const params = new URLSearchParams();
      params.append('username', authEmail);
      params.append('password', authPassword);
      const res = await fetchWithRetry(`${API_BASE}/auth/login`, {
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
    } catch { setAuthError('Connection server error. Backend might be down.'); }
    setIsImapConnecting(false);
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
      'Work & Projects':      'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
      'Finance & Billing':    'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      'Networking':           'bg-sky-500/15 text-sky-400 border border-sky-500/30',
      'System Alerts':        'bg-rose-500/15 text-rose-400 border border-rose-500/30',
      'Newsletters':          'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      'Education & Placements': 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
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
    if (!dateStr) return '';
    // Backend stores UTC without 'Z' suffix — append it so JS parses correctly as UTC
    const raw = (dateStr.endsWith('Z') || dateStr.includes('+') || dateStr.includes('-', 10)) ? dateStr : dateStr + 'Z';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 172800000) return 'Yesterday';
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
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
              disabled={isGoogleConnecting}
              onClick={async () => {
                setIsGoogleConnecting(true);
                try {
                  const fetchWithRetry = async (url, options = {}, retries = 10, delay = 2000) => {
                    for (let i = 0; i < retries; i++) {
                      try {
                        const res = await fetch(url, options);
                        return res;
                      } catch (err) {
                        if (i === retries - 1) throw err;
                        await new Promise(r => setTimeout(r, delay));
                      }
                    }
                  };
                  const res = await fetchWithRetry(`${API_BASE}/auth/google/login`);
                  if (!res.ok) throw new Error('Login fetch failed');
                  const data = await res.json();
                  if (data.url) {
                    window.location.href = data.url;
                  }
                } catch (err) {
                  console.error('Login error:', err);
                  alert('Failed to connect to backend for login. Make sure the backend is running.');
                } finally {
                  setIsGoogleConnecting(false);
                }
              }}
              className="w-full py-3.5 rounded-xl font-semibold text-sm bg-white text-zinc-900 hover:bg-zinc-100 transition-all flex justify-center items-center gap-3 shadow-lg shadow-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGoogleConnecting ? 'Connecting to backend (might take 15s)...' : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  Continue with Google
                </>
              )}
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

              <button type="submit" disabled={isImapConnecting} className="w-full py-3.5 rounded-xl font-bold text-sm text-white gradient-primary shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {isImapConnecting ? (
                  <> Connecting to backend... </>
                ) : (
                  <> <LogIn className="h-4 w-4" /> Connect via IMAP </>
                )}
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
  const totalEmails = analytics?.security_stats?.total_emails || emails.filter(e => !e.is_simulated).length;
  const threatsBlocked = (analytics?.security_stats?.spam_count || 0) + (analytics?.security_stats?.phishing_count || 0);
  const unreadCount = emails.filter(e => !e.is_read).length;

  const chartsGrid = (
    <div className="w-full max-w-6xl mx-auto my-8">
      <div className="grid grid-cols-1 gap-12">
        <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-5 relative overflow-hidden">
          <div className="absolute top-5 left-5 w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 z-10">
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <h4 className="text-xs font-bold text-white mb-6 ml-11 mt-1.5 z-10 relative">Pipeline throughput · last 24h</h4>
          <div className="h-64 mt-4 relative z-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.daily_volume || []} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
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
                <Area type="monotone" name="flagged" dataKey={(d) => Math.round(d.count * 0.1)} stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorFlagged)" dot={false} activeDot={{ r: 4, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-5 relative overflow-hidden">
          <div className="absolute top-5 left-5 w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 z-10">
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <h4 className="text-xs font-bold text-white mb-6 ml-11 mt-1.5 z-10 relative">Category distribution</h4>
          <div className="h-64 mt-4 relative z-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart onClick={(data) => {
                  if (data && data.activeLabel) {
                    setSelectedCategory(selectedCategory === data.activeLabel ? null : data.activeLabel);
                  }
                }} data={analytics?.category_distribution || []} margin={{ top: 10, right: 0, left: -20, bottom: 35 }} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis dataKey="category" stroke="#52525b" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa' }} dy={10} interval={0} />
                <YAxis stroke="#52525b" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                <Tooltip 
                  cursor={{ fill: '#27272a', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '12px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  labelStyle={{ fontSize: '11px', color: '#a1a1aa', marginBottom: '4px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {analytics?.category_distribution?.map((entry, index) => {
                    // Professional, cohesive palette (blues, cyans, indigos, teals)
                    const colors = ['#3b82f6', '#0ea5e9', '#6366f1', '#06b6d4', '#8b5cf6', '#14b8a6', '#4f46e5', '#0284c7', '#2563eb', '#0891b2'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0a0a0f] text-white font-sans">
      {/* ===== GLOBAL HEADER ===== */}
      <header className="h-16 border-b border-zinc-800/50 flex items-center justify-between px-6 shrink-0 bg-[#0a0a0f]">
        {/* Logo */}
        <div className="flex items-center gap-3 w-[260px]">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-md shadow-blue-500/20">
            <Brain className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-[13px] font-bold tracking-wide text-white">Neural Inbox</h1>
            <span className="text-[9px] text-zinc-400 font-bold tracking-widest uppercase block mt-0.5">AI Email Assistant</span>
          </div>
        </div>

        {/* Global Search — Gmail-style with live suggestions */}
        <div className="flex-1 max-w-2xl px-4">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-blue-400 transition-colors z-10 pointer-events-none" />
            <input 
              type="text"
              placeholder="Search emails — names, subjects, or keywords..."
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { setShowSuggestions(false); handleSearch(); }
                if (e.key === 'Escape') { setShowSuggestions(false); }
              }}
              onFocus={() => { if (searchQuery && searchSuggestions.length > 0) setShowSuggestions(true); }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-full py-2 pl-10 pr-10 text-[13px] text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
            />
            {searchQuery && !isSearching && (
              <button onClick={() => { setSearchQuery(''); setIsSearchActive(false); setSearchResults([]); setSearchSuggestions([]); setShowSuggestions(false); setActiveTab('inbox'); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors z-10">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            {/* Live suggestions dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-zinc-600 border-b border-zinc-800">Suggestions</div>
                {searchSuggestions.map((s, i) => (
                  <button key={i} onMouseDown={() => { setSearchQuery(s); setShowSuggestions(false); doSearch(s); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[12px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                    <Search className="w-3 h-3 text-zinc-600 shrink-0" />
                    <span className="line-clamp-1">{s}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status Badges & User */}
        <div className="flex items-center gap-3 shrink-0 relative z-10">
          
          {/* Dummy Mail Dropdown */}
          <div className="relative">
            <button onClick={() => setIsDummyMenuOpen(!isDummyMenuOpen)} disabled={isSimulating} className="px-3 py-1.5 rounded-full border border-zinc-700/50 text-[10px] font-bold text-zinc-400 hover:text-white bg-zinc-800/20 hover:bg-zinc-800 flex items-center gap-1.5 transition-colors">
              <Plus className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} /> {isSimulating ? 'Generating...' : 'Dummy Mail'}
            </button>
            {isDummyMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1.5 z-50 overflow-hidden">
                <button onClick={() => handleSimulateEmail('placement')} className="w-full text-left px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"><Star className="w-3.5 h-3.5 text-blue-400" /> Simulate Placement</button>
                <button onClick={() => handleSimulateEmail('interview')} className="w-full text-left px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-green-400" /> Simulate Interview</button>
                <button onClick={() => handleSimulateEmail('education')} className="w-full text-left px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-purple-400" /> Simulate Education</button>
                <button onClick={() => handleSimulateEmail('phishing')} className="w-full text-left px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"><ShieldAlert className="w-3.5 h-3.5 text-red-400" /> Simulate Phishing</button>
                <button onClick={() => handleSimulateEmail('spam')} className="w-full text-left px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-yellow-400" /> Simulate Spam</button>
                <button onClick={() => handleSimulateEmail('marketing')} className="w-full text-left px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-zinc-400" /> Simulate Marketing</button>
                <button onClick={() => handleSimulateEmail('otp')} className="w-full text-left px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-zinc-400" /> Simulate OTP</button>
                <button onClick={() => handleSimulateEmail('security_safe')} className="w-full text-left px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-green-400" /> Simulate Safe Security</button>
              </div>
            )}
          </div>

            <button onClick={() => isSyncing ? handleStopSync() : setIsSyncing(true)} className={`px-3 py-1.5 rounded-full border text-[10px] font-bold flex items-center gap-1.5 transition-colors ${isSyncing ? 'border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-500/20' : 'border-zinc-700/50 text-zinc-400 bg-zinc-800/20 hover:bg-zinc-800 hover:text-white'}`}>
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} /> {isSyncing ? 'Stop Sync' : 'Start Sync'}
            </button>
          
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-teal-500/20 text-[10px] text-teal-400 font-bold bg-teal-500/5 shadow-[0_0_10px_rgba(20,184,166,0.1)]">
            <Activity className="w-3.5 h-3.5" /> Pipeline healthy
          </div>

          <button onClick={fetchDigest} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition text-xs font-semibold border border-blue-500/20">
            <Sparkles className="w-3.5 h-3.5" /> AI Digest
          </button>
          
          <div className="relative">
            <button onClick={() => setIsAlertsOpen(!isAlertsOpen)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition relative">
              <Bell className="w-4.5 h-4.5" />
              {alerts.filter(a => !a.is_read).length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border border-[#0a0a0f]"></span>
              )}
            </button>
            {isAlertsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-black/20">
                  <span className="text-sm font-bold">Mobile Alerts</span>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {alerts.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-xs">No alerts generated yet.</div>
                  ) : alerts.map(alert => (
                    <div key={alert.id} className={`p-4 border-b border-zinc-800/50 hover:bg-zinc-800/50 transition cursor-pointer ${alert.is_read ? 'opacity-75' : 'bg-blue-500/5'}`}>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                          {alert.alert_type === 'Security' ? <ShieldAlert className="w-4 h-4 text-red-400" /> : <Bell className="w-4 h-4 text-blue-400" />}
                        </div>
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold text-zinc-200">{alert.title}</span>
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-relaxed mb-2">{alert.message}</p>
                          <div className="inline-block px-2 py-0.5 rounded text-[9px] font-medium bg-zinc-800 text-zinc-500">
                            Reason: {alert.trigger_reason}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button onClick={() => setShowSettingsModal(true)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition">
            <Settings className="w-4.5 h-4.5" />
          </button>

          {/* Avatar Dropdown */}
          <div className="relative">
            <button onClick={() => setIsAvatarMenuOpen(!isAvatarMenuOpen)} className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-[11px] font-bold border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all hover:scale-105">
              {currentUser?.full_name?.charAt(0) || currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}
            </button>
            {isAvatarMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1.5 z-50 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-zinc-800/50">
                  <p className="text-xs font-bold text-white truncate">{currentUser?.full_name || 'User'}</p>
                  <p className="text-[10px] text-zinc-500 truncate mt-0.5">{currentUser?.email}</p>
                </div>
                <button onClick={() => { setIsAvatarMenuOpen(false); handleLogout(); }} className="w-full text-left px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2">
                  <LogOut className="w-3.5 h-3.5" /> Log Out / Switch Account
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===== MAIN DASHBOARD CONTENT ===== */}
      <main className="flex-1 flex flex-col min-w-0 p-5 overflow-hidden">
        
        {/* KPI Cards Row */}
        <div className="grid grid-cols-4 gap-5 mb-5 shrink-0">
          <div className="group rounded-2xl border border-zinc-800/50 bg-[#0F131D] p-5 flex items-center gap-4 hover:border-cyan-500/50 hover:bg-cyan-500/5 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 group-hover:bg-cyan-500 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-300">
              <Layers className="w-5 h-5 text-cyan-400 group-hover:text-white transition-colors" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Emails processed</span>
              <h3 className="text-xl font-black text-white leading-none">{totalEmails.toLocaleString()}</h3>
              <span className="text-[10px] text-cyan-400 font-bold mt-1.5 block">+12.4% today</span>
            </div>
          </div>
          
          <div className="group rounded-2xl border border-zinc-800/50 bg-[#0F131D] p-5 flex items-center gap-4 hover:border-pink-500/50 hover:bg-pink-500/5 hover:shadow-[0_0_20px_rgba(236,72,153,0.15)] transition-all cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center border border-pink-500/20 group-hover:bg-pink-500 group-hover:shadow-[0_0_15px_rgba(236,72,153,0.4)] transition-all duration-300">
              <ShieldAlert className="w-5 h-5 text-pink-400 group-hover:text-white transition-colors" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Threats blocked</span>
              <h3 className="text-xl font-black text-white leading-none">{threatsBlocked}</h3>
              <span className="text-[10px] text-pink-400 font-bold mt-1.5 block">2 today</span>
            </div>
          </div>
          
          <div className="group rounded-2xl border border-zinc-800/50 bg-[#0F131D] p-5 flex items-center gap-4 hover:border-violet-500/50 hover:bg-violet-500/5 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20 group-hover:bg-violet-500 group-hover:shadow-[0_0_15px_rgba(139,92,246,0.4)] transition-all duration-300">
              <Sparkles className="w-5 h-5 text-violet-400 group-hover:text-white transition-colors" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Hours saved</span>
              <h3 className="text-xl font-black text-white leading-none">26.5</h3>
              <span className="text-[10px] text-violet-400 font-bold mt-1.5 block">this week</span>
            </div>
          </div>
          
          <div className="group rounded-2xl border border-zinc-800/50 bg-[#0F131D] p-5 flex items-center gap-4 hover:border-teal-500/50 hover:bg-teal-500/5 hover:shadow-[0_0_20px_rgba(20,184,166,0.15)] transition-all cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center border border-teal-500/20 group-hover:bg-teal-500 group-hover:shadow-[0_0_15px_rgba(20,184,166,0.4)] transition-all duration-300">
              <Database className="w-5 h-5 text-teal-400 group-hover:text-white transition-colors" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Vector index</span>
              <h3 className="text-xl font-black text-white leading-none">1.2M</h3>
              <span className="text-[10px] text-teal-400 font-bold mt-1.5 block">FAISS · HNSW</span>
            </div>
          </div>
        </div>

        {/* Side-by-Side Flex */}
        <div className="flex-1 flex gap-5 min-h-0">
          
          {/* LEFT: Email List OR Search Results */}
          <div className="w-[420px] flex flex-col h-full shrink-0 border border-zinc-800/50 rounded-2xl bg-[#0F131D] overflow-hidden">
             {activeTab === 'search' ? (
                <div className="flex flex-col h-full">
                  <div className="px-5 py-4 border-b border-zinc-800/50 flex justify-between items-center bg-[#0a0a0f]">
                    <h3 className="text-[13px] font-bold text-white flex items-center gap-2">
                       <Search className="w-4 h-4 text-blue-400"/> Search Results
                    </h3>
                    <button onClick={() => setActiveTab('inbox')} className="text-[11px] font-bold text-zinc-400 hover:text-white">Clear</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {searchResults.length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-sm text-zinc-500">No results found.</p>
                      </div>
                    ) : searchResults.map(({ email, similarity_score: score }) => (
                      <div key={email.id} onClick={() => { selectEmailAndMarkRead(email); }}
                        className="p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/30 hover:bg-zinc-900/60 cursor-pointer transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getCategoryColor(email.category)}`}>{email.category}</span>
                          <span className="text-[10px] font-bold text-blue-400">{Math.round(score * 100)}% match</span>
                        </div>
                        <h4 className="text-[12px] font-bold text-zinc-200 line-clamp-1">{email.subject}</h4>
                        <p className="text-[11px] text-zinc-600 line-clamp-1 mt-1">{email.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
             ) : (
                <div className="flex flex-col h-full">
                {/* Real vs Simulated Tabs */}
                <div className="flex border-b border-zinc-800/50 items-center justify-between">
                  <div className="flex flex-1">
                    <button 
                      onClick={() => setEmailSourceFilter('real')}
                      className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                        emailSourceFilter === 'real' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
                      }`}
                    >
                      Real Inbox
                    </button>
                    <button 
                      onClick={() => setEmailSourceFilter('simulated')}
                      className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                        emailSourceFilter === 'simulated' ? 'border-purple-500 text-purple-400 bg-purple-500/5' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
                      }`}
                    >
                      Simulations
                    </button>
                  </div>
                  {emailSourceFilter === 'simulated' && (
                    <button 
                      onClick={handleRefreshSimulations}
                      disabled={isRefreshing}
                      className="px-4 text-zinc-400 hover:text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-l border-zinc-800 flex items-center justify-center hover:bg-purple-500/5 self-stretch"
                      title="Clear simulated emails"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} />
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="px-3 py-3 border-b border-zinc-800/50 flex flex-col gap-3 justify-between bg-zinc-900/20">
                  <div className="flex flex-wrap gap-2 justify-between items-center w-full">
                    {[
                      { id: 'all', icon: Layers, label: 'All' },
                      { id: 'threats', icon: ShieldAlert, label: 'Threats' },
                      { id: 'unread', icon: Inbox, label: 'Unread' }
                    ].map(f => (
                      <button key={f.id}
                        onClick={() => setSecurityFilter(f.id)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border flex-1 ${
                          securityFilter === f.id
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                            : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <f.icon className="w-3.5 h-3.5" /> {f.label}
                      </button>
                    ))}
                  </div>
                  <select 
                    value={selectedCategory || ""} 
                    onChange={(e) => setSelectedCategory(e.target.value === "" ? null : e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-[11px] font-bold rounded-lg px-3 py-2 text-zinc-400 focus:outline-none hover:border-zinc-700 transition-colors cursor-pointer"
                  >
                    <option value="">All Categories</option>
                    {analytics?.category_distribution?.map(item => (
                       <option key={item.category} value={item.category}>{item.category}</option>
                    ))}
                  </select>
                </div>

                {/* Email Items */}
                <div className="flex-1 overflow-y-auto">
                  {emails.filter(email => (emailSourceFilter === 'simulated' ? email.is_simulated : !email.is_simulated)).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <Mail className="h-10 w-10 text-zinc-700 mb-3" />
                      <p className="text-sm font-semibold text-zinc-500">No emails yet</p>
                      <p className="text-xs text-zinc-600 mt-1">
                        {emailSourceFilter === 'simulated' ? 'Click "Dummy Mail" to test the pipeline' : 'Click "Sync Gmail" to fetch your inbox'}
                      </p>
                    </div>
                  ) : emails.filter(email => {
                    if (emailSourceFilter === 'simulated' && !email.is_simulated) return false;
                    if (emailSourceFilter === 'real' && email.is_simulated) return false;
                    
                    if (securityFilter === 'threats') return email.is_phishing || email.is_spam;
                    if (selectedCategory && email.category !== selectedCategory) return false;
                    if (securityFilter === 'unread') return !email.is_read;
                    return true;
                  }).sort((a, b) => {
                      if (sortCategory) {
                        if (a.category === sortCategory && b.category !== sortCategory) return -1;
                        if (a.category !== sortCategory && b.category === sortCategory) return 1;
                      }
                      return new Date(b.received_at) - new Date(a.received_at);
                    }).map(email => {
                    const sec = getSecurityBadge(email);
                    return (
                      <div key={email.id} onClick={() => { selectEmailAndMarkRead(email); setDetailTab('AI Summary'); }}
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
            )}
          </div>

          {/* RIGHT: Email Details / Analytics */}
          <div className="flex-1 flex flex-col min-w-0 border border-zinc-800/50 rounded-2xl bg-[#0F131D] overflow-hidden relative shadow-lg">
            {selectedEmail ? (
              <div className="absolute inset-0 overflow-y-auto">
                {/* Detail Header */}
                <div className="px-8 py-6 border-b border-zinc-800/50">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full ${getInitialColor(selectedEmail.sender)} flex items-center justify-center text-lg font-bold text-white shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-zinc-700`}>
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
                        </div>

                        {/* SECURITY ANALYSIS BLOCK */}
                        <div className="mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                          <ShieldAlert className="w-3.5 h-3.5" /> SECURITY ANALYSIS
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4 mb-5">
                          <div className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800/50">
                            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Overall Risk</span>
                            <span className={`text-sm font-black ${selectedEmail.final_verdict === 'Phishing' ? 'text-red-400' : selectedEmail.final_verdict === 'Suspicious' ? 'text-orange-400' : 'text-emerald-400'}`}>
                              {selectedEmail.final_verdict === 'Phishing' ? 'HIGH' : selectedEmail.final_verdict === 'Suspicious' ? 'MEDIUM' : 'LOW'}
                            </span>
                          </div>
                          <div className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800/50">
                            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Phishing Risk</span>
                            <span className="text-sm font-black text-red-400">{Math.round(selectedEmail.phishing_score * 100)}%</span>
                          </div>
                          <div className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800/50">
                            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Spam Prob</span>
                            <span className="text-sm font-black text-orange-400">{Math.round(selectedEmail.spam_score * 100)}%</span>
                          </div>
                          <div className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800/50">
                            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Sender Trust</span>
                            <span className="text-sm font-black text-cyan-400">{Math.round((selectedEmail.trust_score || 0) * 100)}%</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="space-y-2">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Authentication</span>
                            <div className="text-[11px] text-zinc-300 space-y-1">
                              <div className="flex items-center gap-1.5">{selectedEmail.spf_status === 'Pass' ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-red-400" />} SPF {selectedEmail.spf_status || 'Unknown'}</div>
                              <div className="flex items-center gap-1.5">{selectedEmail.dkim_status === 'Pass' ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-red-400" />} DKIM {selectedEmail.dkim_status || 'Unknown'}</div>
                              <div className="flex items-center gap-1.5">{selectedEmail.dmarc_status === 'Pass' ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-red-400" />} DMARC {selectedEmail.dmarc_status || 'Unknown'}</div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Domain</span>
                            <div className="text-[11px] text-zinc-300 space-y-1">
                              {selectedEmail.domain_impersonation ? (
                                <div className="flex gap-1.5 items-start text-red-400"><AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> Impersonation detected</div>
                              ) : (
                                <div className="flex gap-1.5 items-start text-zinc-400"><Check className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" /> No impersonation</div>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">URLs</span>
                            <div className="text-[11px] text-zinc-300 space-y-1">
                              <div className="flex gap-1.5 items-start"><Search className="w-3 h-3 text-cyan-400 mt-0.5 shrink-0" /> Links scanned</div>
                              {selectedEmail.phishing_reasons && JSON.parse(selectedEmail.phishing_reasons).some(r => r.includes('URL')) ? (
                                <div className="flex gap-1.5 items-start text-red-400"><AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> Suspicious URLs</div>
                              ) : (
                                <div className="flex gap-1.5 items-start"><Check className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" /> No malicious URLs</div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Tab bar */}
                        <div className="flex gap-2 bg-zinc-900/50 p-1.5 rounded-xl mt-6 border border-zinc-800/50">
                          {['Original Message', 'Intelligence', 'AI Summary', 'Smart Reply'].map((tab, i) => (
                            <button key={tab} 
                              onClick={() => setDetailTab(tab)}
                              className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${
                              detailTab === tab 
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
                    <div className="px-6 py-5 space-y-5 pb-12">

                      {/* Threat Warning & Final Verdict */}
                      <div className={`p-4 rounded-xl ${selectedEmail.final_verdict === 'Phishing' || selectedEmail.is_phishing ? 'bg-red-500/5 border-red-500/20' : selectedEmail.final_verdict === 'Suspicious' || selectedEmail.is_spam ? 'bg-orange-500/5 border-orange-500/20' : 'bg-emerald-500/5 border-emerald-500/20'} border flex items-start gap-3 fade-in`}>
                        <div className={`p-2 rounded-lg shrink-0 ${selectedEmail.final_verdict === 'Phishing' || selectedEmail.is_phishing ? 'bg-red-500/10' : selectedEmail.final_verdict === 'Suspicious' || selectedEmail.is_spam ? 'bg-orange-500/10' : 'bg-emerald-500/10'}`}>
                          {selectedEmail.final_verdict === 'Phishing' || selectedEmail.is_phishing || selectedEmail.final_verdict === 'Suspicious' || selectedEmail.is_spam ? (
                            <ShieldAlert className={`h-5 w-5 ${selectedEmail.final_verdict === 'Phishing' || selectedEmail.is_phishing ? 'text-red-400' : 'text-orange-400'}`} />
                          ) : (
                            <Check className="h-5 w-5 text-emerald-400" />
                          )}
                        </div>
                        <div>
                          <h4 className={`text-xs font-bold mb-1 ${selectedEmail.final_verdict === 'Phishing' || selectedEmail.is_phishing ? 'text-red-400' : selectedEmail.final_verdict === 'Suspicious' || selectedEmail.is_spam ? 'text-orange-400' : 'text-emerald-400'}`}>
                            FINAL VERDICT: {selectedEmail.final_verdict === 'Phishing' || selectedEmail.is_phishing ? '🔴 PHISHING — HIGH RISK' : selectedEmail.final_verdict === 'Suspicious' || selectedEmail.is_spam ? '🟡 SUSPICIOUS — ELEVATED RISK' : '🟢 SAFE — NO THREATS DETECTED'}
                          </h4>
                          <div className="text-[11px] text-zinc-400 leading-relaxed mb-3 mt-2">
                            <strong className="text-zinc-300 block mb-1">Reasons:</strong>
                            <ul className="space-y-1">
                              {selectedEmail.phishing_reasons && JSON.parse(selectedEmail.phishing_reasons).length > 0 ? (
                                JSON.parse(selectedEmail.phishing_reasons).map((reason, idx) => (
                                  <li key={idx}>{reason}</li>
                                ))
                              ) : (
                                <li>{selectedEmail.final_verdict === 'Phishing' || selectedEmail.is_phishing ? 'Security models detected phishing patterns.' : selectedEmail.final_verdict === 'Suspicious' || selectedEmail.is_spam ? 'Classified as unsolicited bulk email.' : 'All security checks passed. No malicious patterns found.'}</li>
                              )}
                            </ul>
                          </div>
                          <div className="flex gap-3 text-[10px] text-zinc-500 items-center">
                            <span>Phishing Risk: <strong className={selectedEmail.final_verdict === 'Safe' && !selectedEmail.is_phishing && !selectedEmail.is_spam ? 'text-emerald-400' : 'text-red-400'}>{Math.round(selectedEmail.phishing_score * 100)}%</strong></span>
                            <span>Spam Prob: <strong className={selectedEmail.final_verdict === 'Safe' && !selectedEmail.is_phishing && !selectedEmail.is_spam ? 'text-emerald-400' : 'text-orange-400'}>{Math.round(selectedEmail.spam_score * 100)}%</strong></span>
                            {(selectedEmail.final_verdict !== 'Safe' || selectedEmail.is_phishing || selectedEmail.is_spam) && (
                              <button onClick={() => handleFeedback(selectedEmail.id, "spam_correction", "false")}
                                className="text-blue-400 hover:underline font-semibold">Mark as Safe</button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* LLM Digest */}
                      {detailTab === 'AI Summary' && (
                        <div className="rounded-xl border border-zinc-800/50 overflow-hidden fade-in">
                          <div className="px-4 py-3 bg-zinc-900/50 border-b border-zinc-800/50 flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                            <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                              LLM digest
                              {isRegenerating && <span className="text-[10px] text-zinc-500 italic ml-2">regenerating...</span>}
                            </span>
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
                      )}

                      {/* NER Entities */}
                      {detailTab === 'Entities' && selectedEmail.entities?.length > 0 && (
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
                      
                      {detailTab === 'Entities' && (!selectedEmail.entities || selectedEmail.entities.length === 0) && (
                        <div className="p-8 text-center text-[12px] text-zinc-500 italic">No entities detected in this email.</div>
                      )}

                      {/* Original Message */}
                      
                      {detailTab === 'Intelligence' && (
                        <>

                          {/* --- ALERT DECISION DEBUGGER --- */}
                          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mt-6 shadow-xl">
                            <div className="bg-zinc-800/50 p-3 border-b border-zinc-800 flex items-center justify-between">
                              <h3 className="text-xs font-bold text-zinc-300 tracking-wider uppercase flex items-center gap-2">
                                <Activity className="w-3.5 h-3.5 text-blue-400"/> Alert Decision Debugger
                              </h3>
                            </div>
                            <div className="p-4 grid grid-cols-2 gap-4 text-[12px]">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  {selectedEmail.category !== 'Spam' && selectedEmail.category !== 'Promotions' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400"/> : <X className="w-3.5 h-3.5 text-red-400"/>}
                                  <span className="text-zinc-400">Category: <span className="text-white font-medium">{selectedEmail.category || 'N/A'}</span></span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {selectedEmail.action_items && selectedEmail.action_items !== '[]' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400"/> : <X className="w-3.5 h-3.5 text-zinc-500"/>}
                                  <span className="text-zinc-400">Action Required</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {selectedEmail.deadlines && selectedEmail.deadlines !== '[]' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400"/> : <X className="w-3.5 h-3.5 text-zinc-500"/>}
                                  <span className="text-zinc-400">Deadline</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  {selectedEmail.priority === 'Critical' || selectedEmail.priority === 'High' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400"/> : <X className="w-3.5 h-3.5 text-zinc-500"/>}
                                  <span className="text-zinc-400">Priority: <span className="text-white font-medium">{selectedEmail.priority || 'N/A'}</span></span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {selectedEmail.needs_alert ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400"/> : <X className="w-3.5 h-3.5 text-zinc-500"/>}
                                  <span className="text-zinc-400">Watchlist Match</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {selectedEmail.is_phishing ? <CheckCircle2 className="w-3.5 h-3.5 text-red-500"/> : <X className="w-3.5 h-3.5 text-zinc-500"/>}
                                  <span className="text-zinc-400">Security Threat</span>
                                </div>
                              </div>
                            </div>
                            <div className={`p-4 border-t border-zinc-800 ${selectedEmail.needs_alert ? 'bg-blue-500/10' : 'bg-black/20'}`}>
                                <div className="text-xs font-bold mb-1 tracking-widest text-zinc-500 uppercase">Decision</div>
                                <div className={`text-sm font-black mb-3 ${selectedEmail.needs_alert ? 'text-blue-400' : 'text-zinc-400'}`}>
                                  {selectedEmail.needs_alert ? '🔔 SEND ALERT' : '🔕 NO NOTIFICATION'}
                                </div>
                                
                                <div className="text-[11px] text-zinc-400 bg-[#0a0a0f] p-3 rounded-lg border border-zinc-800 font-mono">
                                  {selectedEmail.needs_alert 
                                    ? `Reason: Matched alert criteria based on priority, watchlist, or security threat.`
                                    : `Reason: Spam/low-priority email or no actionable event detected.`}
                                </div>
                            </div>
                          </div>
                          {/* ------------------------------- */}

                        <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          {selectedEmail.why_it_matters && (
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-5">
                              <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4 text-purple-400" />
                                <h3 className="text-sm font-bold text-purple-300 tracking-wide uppercase">Why this matters</h3>
                              </div>
                              <p className="text-[13px] text-zinc-300 leading-relaxed font-medium">{selectedEmail.why_it_matters}</p>
                            </div>
                          )}
                          
                          {selectedEmail.deadlines && selectedEmail.deadlines !== '[]' && (
                            <div>
                              <h3 className="text-xs font-bold text-zinc-400 tracking-wider uppercase mb-3 flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5" /> Detected Deadlines
                              </h3>
                              <div className="space-y-2">
                                {JSON.parse(selectedEmail.deadlines).map((dl, idx) => (
                                  <div key={idx} className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
                                    <div>
                                      <div className="text-[13px] font-bold text-zinc-200">{dl.title}</div>
                                      <div className="text-[11px] text-zinc-500 italic mt-0.5">"{dl.source_text}"</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-[12px] font-bold text-blue-400">{new Date(dl.datetime).toLocaleString()}</div>
                                      <div className="text-[10px] text-zinc-500 font-medium">Confidence: {Math.round(dl.confidence * 100)}%</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {selectedEmail.action_items && selectedEmail.action_items !== '[]' && (
                            <div>
                              <h3 className="text-xs font-bold text-zinc-400 tracking-wider uppercase mb-3 flex items-center gap-2">
                                <ListTodo className="w-3.5 h-3.5" /> Action Items
                              </h3>
                              <div className="space-y-2">
                                {JSON.parse(selectedEmail.action_items).map((action, idx) => (
                                  <div key={idx} className="flex items-start gap-3 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
                                    <div className="w-4 h-4 rounded border border-zinc-600 flex-shrink-0 mt-0.5"></div>
                                    <div className="text-[13px] text-zinc-300">{action}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        </>
                      )}

                      {detailTab === 'Original Message' && (
                        <div className="rounded-xl border border-zinc-800/50 overflow-hidden fade-in h-full flex flex-col">
                          <div className="px-4 py-3 bg-zinc-900/50 border-b border-zinc-800/50 flex items-center justify-between shrink-0">
                            <span className="text-xs font-bold text-zinc-300">Original message</span>
                            <span className="text-[10px] text-zinc-500">Sentiment: <strong className={selectedEmail.sentiment === 'Positive' ? 'text-emerald-400' : selectedEmail.sentiment === 'Negative' ? 'text-red-400' : 'text-zinc-400'}>{selectedEmail.sentiment}</strong></span>
                          </div>
                          <div className="p-4 text-[13px] text-zinc-300 whitespace-pre-wrap leading-relaxed font-light overflow-y-auto min-h-[150px]">
                            {selectedEmail.body?.trim() ? cleanEmailBody(selectedEmail.body) : <span className="text-zinc-500 italic">No text content available (this might be an image-only promotional email or a calendar invite).</span>}
                          </div>
                        </div>
                      )}

                      {/* Smart Replies */}
                      {detailTab === 'Smart Reply' && selectedEmail.replies?.map(reply => (
                        <div key={reply.id} className="rounded-xl border border-violet-500/20 bg-zinc-900/50 p-5 space-y-4 fade-in">
                          <div className="flex items-center justify-between pb-3 border-b border-white/5">
                            <span className="text-[13px] font-black text-violet-400 flex items-center gap-2 tracking-wider">
                              <Sparkles className="h-4 w-4" /> ✦ AI SMART REPLY 
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              reply.status === 'Sent' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                              reply.status === 'Rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/20' :
                              'bg-violet-500/20 text-violet-400 border border-violet-500/20'
                            }`}>{reply.status}</span>
                          </div>
                          
                          {!reply.is_reply_recommended && (selectedEmail.is_phishing || selectedEmail.final_verdict === 'Phishing') ? (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                              <div className="flex items-center gap-2 text-red-400 font-bold mb-2">
                                <ShieldAlert className="h-4 w-4" /> 🚫 REPLY DISABLED
                              </div>
                              <p className="text-xs text-red-300/80 leading-relaxed">
                                {reply.recommendation_reason || "This email has been classified as High Risk / Phishing. Replying to this message is not recommended."}
                              </p>
                            </div>
                          ) : !reply.is_reply_recommended ? (
                            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                              <div className="flex items-center gap-2 text-zinc-300 font-bold mb-2">
                                <Info className="h-4 w-4" /> ○ No reply recommended
                              </div>
                              <p className="text-xs text-zinc-400 leading-relaxed">
                                {reply.recommendation_reason || "This is an automated promotional email and does not require a response."}
                              </p>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Reply recommended ✓
                                </div>
                                {reply.recommendation_reason && (
                                  <div className="text-[11px] text-zinc-400 italic">
                                    Reason: {reply.recommendation_reason}
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-4 mt-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-500 font-semibold uppercase">Tone</span>
                                    <select 
                                      className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-[11px] rounded px-2 py-1 focus:outline-none"
                                      value={reply.tone || "Professional"}
                                      onChange={(e) => handleUpdateReplyStatus(reply.id, reply.status, null, e.target.value, reply.length_preference)}
                                    >
                                      <option value="Professional">Professional ▼</option>
                                      <option value="Formal">Formal ▼</option>
                                      <option value="Friendly">Friendly ▼</option>
                                      <option value="Direct">Direct ▼</option>
                                    </select>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-500 font-semibold uppercase">Length</span>
                                    <select 
                                      className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-[11px] rounded px-2 py-1 focus:outline-none"
                                      value={reply.length_preference || "Concise"}
                                      onChange={(e) => handleUpdateReplyStatus(reply.id, reply.status, null, reply.tone, e.target.value)}
                                    >
                                      <option value="Concise">Concise ▼</option>
                                      <option value="Detailed">Detailed ▼</option>
                                    </select>
                                  </div>
                                </div>
                              </div>

                              {editingReply ? (
                                <textarea value={editedReplyText} onChange={(e) => setEditedReplyText(e.target.value)}
                                  rows={5} className="w-full bg-black/40 border border-violet-500/30 rounded-lg p-3 text-[13px] text-zinc-200 focus:outline-none focus:border-violet-500/60 leading-relaxed font-light" />
                              ) : (
                                <div className="text-[13px] bg-black/40 border border-white/5 rounded-lg p-4 text-zinc-300 whitespace-pre-wrap leading-relaxed font-light relative group">
                                  {reply.generated_body}
                                </div>
                              )}
                              
                              <div className="flex gap-2 justify-end pt-2">
                                {editingReply ? (
                                  <>
                                    <button onClick={() => handleUpdateReplyStatus(reply.id, "Suggested")}
                                      className="px-3 py-1.5 rounded-lg border border-zinc-700 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 transition-colors flex items-center gap-1"><X className="h-3 w-3" /> Cancel</button>
                                    <button onClick={() => handleUpdateReplyStatus(reply.id, "Sent", editedReplyText, reply.tone, reply.length_preference)}
                                      className="px-4 py-1.5 rounded-lg bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-500 transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-900/20"><Send className="h-3.5 w-3.5" /> Save & Send</button>
                                  </>
                                ) : reply.status !== 'Sent' && (
                                  <>
                                    <button onClick={() => handleRegenerateReply(reply.id, reply.tone, reply.length_preference)}
                                      className="px-3 py-1.5 rounded-lg border border-violet-500/30 text-xs font-semibold text-violet-300 hover:bg-violet-500/10 transition-colors flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Regenerate</button>
                                    <button onClick={() => { setEditingReply(true); setEditedReplyText(reply.generated_body); }}
                                      className="px-3 py-1.5 rounded-lg border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors flex items-center gap-1.5"><Edit className="h-3 w-3" /> Edit</button>
                                    <button onClick={() => handleUpdateReplyStatus(reply.id, "Sent", null, reply.tone, reply.length_preference)}
                                      className="px-4 py-1.5 rounded-lg gradient-primary text-xs font-bold text-white hover:brightness-110 transition-all flex items-center gap-1.5 shadow-lg shadow-violet-900/20"><Check className="h-3.5 w-3.5" /> Approve & Send</button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))}

                      {/* Feedback removed per user request */}
                    </div>
                    <div className="px-8 pb-12 w-full flex justify-center">
                      {chartsGrid}
                    </div>
                  </div>
                ) : (
              <div className="flex-1 flex flex-col items-center p-12 overflow-y-auto">
                <div className="flex flex-col items-center justify-center py-8 mb-8 border border-dashed border-zinc-800/50 rounded-2xl w-full max-w-4xl bg-zinc-900/10">
                  <Mail className="w-16 h-16 text-zinc-800 mb-4" />
                  <h3 className="text-lg font-bold text-zinc-200">Select an email to view AI analysis</h3>
                  <p className="text-xs text-zinc-500 max-w-sm text-center mt-2 leading-relaxed">Click an email from the list to inspect classification, phishing alerts, NER entities, and LLM summaries.</p>
                </div>
                {chartsGrid}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Digest Modal */}
      {showDigestModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-[#0a0a0f] border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-bold text-white">Daily AI Digest</h2>
              </div>
              <button onClick={() => setShowDigestModal(false)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 text-[14px] leading-relaxed text-zinc-300 whitespace-pre-wrap font-light">
              {dailyDigest ? dailyDigest : (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                  <RefreshCw className="w-8 h-8 animate-spin mb-4" />
                  Generating your intelligence digest...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-[#0a0a0f] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 rounded-t-2xl">
              <h2 className="text-lg font-bold text-white">My Alert Preferences</h2>
              <button onClick={() => setShowSettingsModal(false)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Watchlist Keywords</label>
                <p className="text-[11px] text-zinc-500 mb-2">Comma separated list of terms that are critical to you (e.g. TCS, Placement, Interview, AWS)</p>
                <input type="text" value={alertKeywords} onChange={e => setAlertKeywords(e.target.value)} placeholder="TCS, Infosys, Data Analyst" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:border-blue-500 focus:outline-none" />
              </div>
<div className="pt-4 border-t border-zinc-800/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Browser Push Notifications</span>
                  <span className="text-[10px] text-zinc-500 font-bold bg-zinc-800 px-2 py-0.5 rounded">{notificationPermission}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleTestNotification} className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition">
                    Send Test Notification
                  </button>
                  <span className={`text-[10px] font-bold ${testDeliveryStatus === 'Displayed' ? 'text-green-400' : 'text-red-400'}`}>
                    {testDeliveryStatus}
                  </span>
                </div>
              </div>
              <div className="pt-4 border-t border-zinc-800/50">
                <button onClick={saveAlertPreferences} className="w-full py-2.5 rounded-lg gradient-primary text-sm font-bold text-white hover:brightness-110 transition shadow-lg shadow-blue-500/20">
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


