/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Terminal, Shield, Cpu, Globe, Zap, Download, Upload, Package, LogOut, Search, Filter, CheckCircle2, Code2, Save, FileCode, Plus, Trash2, ChevronRight, User as UserIcon, Lock, Mail, Activity, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchModules, uploadModule, recordDownload } from './lib/moduleService';
import { seedInitialModules } from './lib/seedService';
import { Script, fetchUserScripts, saveScript, deleteScript } from './lib/scriptService';
import { Module, ModuleCategory, UserProfile } from './types';
import { analyzeCode } from './lib/geminiService';

// Custom Components
import BootSequence from './components/BootSequence';
import TerminalEngine from './components/TerminalEngine';

// Editor imports
import Editor from 'react-simple-code-editor';
// @ts-ignore
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';

interface Log {
  id: string;
  text: string;
  type: 'info' | 'error' | 'success' | 'warning' | 'command';
  timestamp: string;
}

export default function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<Module[]>([]);
  const [activeCategory, setActiveCategory] = useState<ModuleCategory | 'all'>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'repo' | 'editor'>('repo');
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);
  const [installingModuleId, setInstallingModuleId] = useState<string | null>(null);

  // Terminal State
  const [logs, setLogs] = useState<Log[]>([
    { id: 'start', text: 'Kernel 4.0.2-pro initialized success.', type: 'success', timestamp: new Date().toLocaleTimeString() },
    { id: 'sec', text: 'SecOps bridge activated.', type: 'info', timestamp: new Date().toLocaleTimeString() }
  ]);
  
  const addLog = (text: string, type: Log['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      text,
      type,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  // Performance simulation
  const [stats, setStats] = useState({ cpu: 12, ram: 45, net: 'STABLE' });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        cpu: Math.floor(Math.random() * 20) + 10,
        ram: 40 + Math.floor(Math.random() * 15),
        net: Math.random() > 0.05 ? 'STABLE' : 'DROPPED'
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Script editing state
  const [scripts, setScripts] = useState<Script[]>([]);
  const [currentScript, setCurrentScript] = useState<Partial<Script>>({
    name: 'untitled.py',
    content: '# Welcome to Termux Pro Editor\nprint("Hello Android")\n',
    language: 'python'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    category: 'development' as ModuleCategory,
    downloadUrl: ''
  });

  useEffect(() => {
    const initApp = async () => {
      try {
        await seedInitialModules();
      } catch (e) {
        console.error('Seed error:', e);
        addLog('SYSTEM_INFO: Remote repository sync restricted for guest access.', 'warning');
      }
    };
    initApp();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          const newProfile = {
            uid: user.uid,
            email: user.email!,
            createdAt: serverTimestamp(),
            installedModules: [],
            xp: 0,
            level: 1
          };
          await setDoc(userRef, newProfile);
          setProfile(newProfile as any);
        } else {
          setProfile({ id: userDoc.id, ...userDoc.data() } as any);
        }
        const userScripts = await fetchUserScripts();
        setScripts(userScripts);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadModules = async () => {
      const data = await fetchModules(activeCategory === 'all' ? undefined : activeCategory);
      setModules(data);
    };
    loadModules();
  }, [activeCategory]);

  const handleSaveScript = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const id = await saveScript({
        id: currentScript.id,
        name: currentScript.name || 'untitled.js',
        content: currentScript.content || '',
        language: currentScript.language || 'javascript'
      });
      if (id) {
        const updatedScripts = await fetchUserScripts();
        setScripts(updatedScripts);
        const saved = updatedScripts.find(s => s.id === id);
        if (saved) setCurrentScript(saved);
        showToast('SCRIPT_COMMITTED_SUCCESSFULLY', 'success');
      }
    } catch (e) {
      showToast('IO_ERROR: SAVE_FAILED', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewScript = () => {
    setCurrentScript({
      name: 'new_script.py',
      content: '',
      language: 'python'
    });
  };

  const handleDeleteScript = async (id: string) => {
    if (confirm('Permanently delete this script?')) {
      await deleteScript(id);
      const updated = await fetchUserScripts();
      setScripts(updated);
      if (currentScript.id === id) handleNewScript();
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setIsAuthProcessing(true);
    try {
      await signInWithPopup(auth, provider);
      showToast('AUTH_SUCCESS: SYSTEM ACCESS GRANTED', 'success');
      setShowAuthModal(false);
    } catch (e) {
      showToast('AUTH_FAILED: ACCESS DENIED', 'error');
    } finally {
      setIsAuthProcessing(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthProcessing(true);
    try {
      if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        showToast('ACCOUNT_CREATED: WELCOME AGENT', 'success');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('LOGIN_SUCCESS: ACCESS GRANTED', 'success');
      }
      setShowAuthModal(false);
    } catch (error: any) {
      const msg = error.code === 'auth/user-not-found' ? 'USER_NOT_FOUND' : 
                   error.code === 'auth/wrong-password' ? 'INVALID_CREDENTIALS' : 
                   error.code === 'auth/email-already-in-use' ? 'EMAIL_TAKEN' : 'AUTH_ERROR';
      showToast(`ERROR: ${msg}`, 'error');
      addLog(`AUTH_ERROR: ${msg}`, 'error');
    } finally {
      setIsAuthProcessing(false);
    }
  };

  const handleLogin = () => setShowAuthModal(true);

  const handleLogout = () => {
    auth.signOut();
    addLog('SYSTEM: SESSION_TERMINATED', 'warning');
  };

  const handleDownload = async (module: Module) => {
    if (!user) {
      showToast('AUTH_REQUIRED: System access denied', 'error');
      return;
    }

    if (installingModuleId) {
      showToast('PROCESS_BUSY: Another installation active', 'warning');
      return;
    }

    setInstallingModuleId(module.id);
    addLog(`Initializing payload transfer for ${module.name}...`, 'command');
    
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    const runInstallation = async () => {
      try {
        // Step 1: Pre-install Checks
        addLog(`System check: Verifying environment integrity...`, 'info');
        await delay(500);
        addLog(`Checking for conflicting toolchains: None found.`, 'success');
        
        // Step 2: Network & Download
        addLog(`Connecting to secure node: ${Math.random().toString(16).slice(2, 10)}.termux-pro.net`, 'info');
        await delay(800);
        addLog(`GET ${module.downloadUrl.substring(0, 40)}...`, 'info');
        addLog(`Transferring payload [####################] 100%`, 'success');
        
        // Step 3: Verification
        await delay(400);
        addLog(`Fetching GPG signature from secure vault...`, 'info');
        await delay(400);
        addLog(`Signature verification: [GPG_SIG_OK]`, 'success');
        addLog(`sha256sum validation: [MATCH]`, 'success');
        
        // Step 4: Extraction & Path Setup
        await delay(600);
        addLog(`tar -xzvf matrix_payload.tar.gz -C /usr/local/modules/`, 'info');
        addLog(`Resolving recursive dependencies...`, 'info');
        
        // Category Specific Detailed Logs
        await delay(1200);
        switch(module.category) {
          case 'cybersecurity':
            addLog('Initializing Metasploit bridge...', 'warning');
            addLog('Loading wordlists into secondary storage...', 'info');
            addLog('Configuring proxychains-ng for anonymous uplink...', 'success');
            addLog('Compiling custom exploit modules...', 'info');
            break;
          case 'ai':
            addLog('Scanning hardware for NPU/GPU capability...', 'info');
            addLog('Found Qualcomm Hexagon NPU. Initializing driver...', 'success');
            addLog('Downloading neural weights (4.2GB indexed buffer)...', 'info');
            addLog('Allocating VRAM for inference threads...', 'warning');
            break;
          case 'development':
            addLog('Linking dynamic C++ libraries...', 'info');
            addLog('Installing local node_modules via optimized cache...', 'info');
            addLog('Generating system-level environment variables...', 'success');
            addLog('Pre-compiling TypeScript assets...', 'info');
            break;
          case 'automation':
            addLog('Mapping crontab schedule tasks...', 'info');
            addLog('Initializing systemd-lite manager...', 'info');
            addLog('Configuring webhook listeners...', 'success');
            break;
          case 'web':
            addLog('Initializing lightweight Nginx node...', 'info');
            addLog('Generating SSL certificates via LocalCA...', 'success');
            addLog('Configuring Port 80/443 redirection...', 'info');
            break;
          default:
            addLog('Syncing subsystem databases...', 'info');
            addLog('Indexing local documentation...', 'info');
        }

        // Step 5: Finalization
        await delay(1000);
        addLog(`Setting permissions: chmod +x /bin/${module.name.toLowerCase().replace(/\s+/g, '_')}`, 'info');
        addLog(`Adding to system PATH variable...`, 'success');
        addLog(`Running post-install cleanup...`, 'info');
        
        await recordDownload(module.id);
        
        if (profile) {
          const userRef = doc(db, 'users', user.uid);
          const newXp = profile.xp + 250;
          const newLevel = Math.floor(newXp / 1000) + 1;
          const newInstalled = [...(profile.installedModules || [])];
          if (!newInstalled.includes(module.id)) newInstalled.push(module.id);
          
          await setDoc(userRef, {
            ...profile,
            xp: newXp,
            level: newLevel,
            installedModules: newInstalled,
            updatedAt: serverTimestamp()
          }, { merge: true });
          
          setProfile({ ...profile, xp: newXp, level: newLevel, installedModules: newInstalled });
          addLog(`XP_EARNED: +250 | SYSTEM_LVL: ${newLevel}`, 'success');
          showToast(`SUCCESS: ${module.name.toUpperCase()} INTEGRATED`, 'success');
        }

        addLog(`INSTALLATION_COMPLETE: ${module.name} is now active.`, 'success');
        
        // Trigger browser download in parallel/background
        const link = document.createElement('a');
        link.href = module.downloadUrl;
        link.download = `${module.name.replace(/\s+/g, '_')}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

      } catch (e) {
        addLog(`FATAL_ERROR: INSTALLATION_INTERRUPTED`, 'error');
        showToast('INSTALL_FAILED', 'error');
      } finally {
        setInstallingModuleId(null);
      }
    };

    runInstallation();
  };

  const handleAnalyzeCode = async () => {
    if (!currentScript.content) return;
    setIsAnalyzing(true);
    addLog(`AI_CORE: Analyzing code flow...`, 'command');
    try {
      const suggestion = await analyzeCode(currentScript.content, currentScript.language || 'python');
      setAiResult(suggestion);
      addLog(`AI_CORE: Analysis complete. Data pushed to buffer.`, 'success');
      showToast('AI_ANALYSIS_COMPLETE', 'info');
    } catch (e) {
      addLog(`AI_CORE_ERROR: Link failed. Check credentials.`, 'error');
      showToast('AI_LINK_FAILED', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredModules = modules.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();
    addLog(cmd, 'command');

    if (trimmed === 'help') {
      addLog('Available commands: help, clear, whoami, ls, fetch_modules, sys_info', 'info');
    } else if (trimmed === 'clear') {
      setLogs([{ id: 'start', text: 'Terminal cleared.', type: 'info', timestamp: new Date().toLocaleTimeString() }]);
    } else if (trimmed === 'whoami') {
      if (user) {
        addLog(`USER: ${user.email}`, 'success');
        addLog(`UID: ${user.uid}`, 'info');
        addLog(`LEVEL: ${profile?.level || 1}`, 'info');
        addLog(`XP: ${profile?.xp || 0}`, 'info');
      } else {
        addLog('ANONYMOUS_ACCESS_DETECTED. Please login.', 'warning');
      }
    } else if (trimmed === 'ls') {
      if (scripts.length > 0) {
        addLog('SCRIPTS_ROOT:', 'info');
        scripts.forEach(s => addLog(`  - ${s.name} (${s.language})`, 'info'));
      } else {
        addLog('No local scripts found.', 'info');
      }
    } else if (trimmed === 'fetch_modules') {
      addLog('Querying central repository...', 'command');
      setTimeout(() => {
        addLog(`Found ${modules.length} compatible modules.`, 'success');
      }, 800);
    } else if (trimmed === 'sys_info') {
      addLog(`CPU: ${stats.cpu}% | RAM: ${stats.ram}% | NET: ${stats.net}`, 'info');
      addLog('OS: Termux Pro v4.0.2 (Android 14)', 'info');
    } else {
      addLog(`sh: command not found: ${trimmed}`, 'error');
    }
  };

  if (isBooting) return <BootSequence onComplete={() => setIsBooting(false)} />;

  if (loading) return (
    <div className="min-h-screen bg-crust flex items-center justify-center">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <Zap className="text-matrix w-12 h-12" />
      </motion.div>
    </div>
  );

  return (
    <div className="h-screen bg-crust text-[#E0E0E0] font-sans flex flex-col overflow-hidden selection:bg-matrix selection:text-black">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-edge flex items-center justify-between px-8 bg-mantle shrink-0">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-matrix rounded-sm flex items-center justify-center">
            <Terminal className="text-black w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tighter uppercase text-matrix">Termux Pro Platform <span className="text-muted font-normal px-2">v4.0.2</span></h1>
        </div>
        <div className="hidden md:flex items-center space-x-6 text-[11px] font-mono tracking-widest uppercase">
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 shadow-[0_0_8px_#00FF41] ${user ? 'bg-matrix animate-pulse' : 'bg-danger shadow-[0_0_8px_#FF3E3E]'}`}></div>
            {user ? 'SYSTEM: SESSION_ACTIVE' : 'SYSTEM: ENCRYPTED_LOCK'}
          </div>
          <div className="text-muted">HOST: 192.168.1.42</div>
          {user ? (
            <button
              onClick={handleLogout}
              className="bg-edge px-3 py-1 rounded-sm border border-[#333] hover:bg-[#333] transition-colors cursor-pointer flex items-center gap-2"
            >
              AUTH: {user.displayName?.toUpperCase() || user.email?.split('@')[0].toUpperCase()}
              <LogOut className="w-3 h-3 text-danger" />
            </button>
          ) : (
            <button 
              onClick={handleLogin}
              className="bg-matrix text-black px-3 py-1 rounded-sm border border-matrix hover:opacity-90 font-bold transition-all cursor-pointer"
            >
              INITIALIZE_SYSTEM
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="col-span-12 md:col-span-2 border-r border-edge bg-[#080808] flex flex-col p-4 overflow-y-auto no-scrollbar">
          <div className="text-[10px] text-[#444] mb-4 font-bold uppercase tracking-widest">Navigation</div>
          <nav className="space-y-1 mb-8">
            <button
              onClick={() => setActiveView('repo')}
              className={`w-full p-3 flex items-center gap-3 text-xs transition-all border-l-2 uppercase tracking-tight ${
                activeView === 'repo' 
                ? 'bg-edge/30 border-matrix text-matrix' 
                : 'hover:bg-edge/20 text-muted border-transparent'
              }`}
            >
              <Package className="w-4 h-4" />
              01. REPOSITORY
            </button>
            <button
              onClick={() => setActiveView('editor')}
              className={`w-full p-3 flex items-center gap-3 text-xs transition-all border-l-2 uppercase tracking-tight ${
                activeView === 'editor' 
                ? 'bg-edge/30 border-matrix text-matrix' 
                : 'hover:bg-edge/20 text-muted border-transparent'
              }`}
            >
              <Code2 className="w-4 h-4" />
              02. CODE EDITOR
            </button>
            {user && (
              <button
                onClick={() => setActiveView('repo')} // For now repo serves as dashboard or we can add one
                className={`w-full p-3 flex items-center gap-3 text-xs transition-all border-l-2 uppercase tracking-tight ${
                  activeView === 'repo' && profile 
                  ? 'bg-edge/30 border-matrix text-matrix' 
                  : 'hover:bg-edge/20 text-muted border-transparent'
                }`}
              >
                <Activity className="w-4 h-4" />
                03. SYSTEM DASH
              </button>
            )}
          </nav>

          <div className="mt-4 mb-8 space-y-3">
            <div className="text-[10px] text-[#444] mb-2 font-bold uppercase tracking-widest">Hardware Telemetry</div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[9px] font-mono">
                <span className="text-muted">CPU_LOAD</span>
                <span className={stats.cpu > 80 ? 'text-danger' : 'text-matrix'}>{stats.cpu}%</span>
              </div>
              <div className="w-full h-0.5 bg-edge/20 rounded-full overflow-hidden">
                <motion.div animate={{ width: `${stats.cpu}%` }} className="h-full bg-matrix/60" />
              </div>
              
              <div className="flex justify-between items-center text-[9px] font-mono">
                <span className="text-muted">MEM_ALLOC</span>
                <span className="text-matrix">{stats.ram}%</span>
              </div>
              <div className="w-full h-0.5 bg-edge/20 rounded-full overflow-hidden">
                <motion.div animate={{ width: `${stats.ram}%` }} className="h-full bg-matrix/60" />
              </div>

              <div className="flex justify-between items-center text-[9px] font-mono mt-2 pt-2 border-t border-edge/10">
                <span className="text-muted">UPLINK</span>
                <span className={stats.net === 'STABLE' ? 'text-matrix' : 'text-danger'}>{stats.net}</span>
              </div>
            </div>
          </div>

          {activeView === 'repo' ? (
            <>
              <div className="text-[10px] text-[#444] mb-4 font-bold uppercase tracking-widest">Sectors</div>
              <nav className="space-y-1">
                {['all', 'development', 'web', 'automation', 'cybersecurity', 'ai'].map((cat) => {
                  const Icon = cat === 'development' ? Code2 :
                               cat === 'web' ? Globe :
                               cat === 'automation' ? Zap :
                               cat === 'cybersecurity' ? Shield :
                               cat === 'ai' ? Cpu :
                               Package; // 'all'
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat as any)}
                      className={`w-full p-3 flex items-center gap-3 text-xs transition-all border-l-2 uppercase tracking-tight ${
                        activeCategory === cat 
                        ? 'bg-edge/30 border-matrix text-matrix' 
                        : 'hover:bg-edge/20 text-muted border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${activeCategory === cat ? 'text-matrix' : 'text-muted'}`} />
                      <div className="flex-1 text-left">
                        {cat === 'all' ? '00. ALL' : `${['01', '02', '03', '04', '05'][['development', 'web', 'automation', 'cybersecurity', 'ai'].indexOf(cat)]}. ${cat}`}
                      </div>
                    </button>
                  );
                })}
              </nav>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] text-[#444] font-bold uppercase tracking-widest">Files</div>
                <button onClick={handleNewScript} className="p-1 hover:text-matrix transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <nav className="space-y-1 overflow-y-auto no-scrollbar max-h-96">
                {scripts.map((s) => (
                  <div 
                    key={s.id}
                    className={`group flex items-center justify-between p-2 text-[11px] border-l-2 transition-all cursor-pointer ${
                      currentScript.id === s.id ? 'bg-edge/30 border-matrix text-matrix' : 'text-muted border-transparent hover:bg-edge/10'
                    }`}
                    onClick={() => setCurrentScript(s)}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className="w-3 h-3 shrink-0" />
                      <span className="truncate">{s.name}</span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteScript(s.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-danger p-1 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {scripts.length === 0 && <div className="text-[10px] text-[#333] p-2 italic uppercase">No scripts saved</div>}
              </nav>
            </>
          )}

          <div className="mt-auto pt-6 border-t border-edge/50">
            <div className="text-[10px] text-[#444] mb-2 uppercase font-bold tracking-widest">Connection Status</div>
            <div className="p-3 bg-edge/10 rounded-sm border border-edge">
              <div className="flex justify-between text-[10px] mb-2 font-mono">
                <span>FIRESTORE</span>
                <span className="text-matrix">ACTIVE</span>
              </div>
              <div className="w-full bg-edge h-1 rounded-full overflow-hidden">
                <div className="bg-matrix w-full h-full"></div>
              </div>
            </div>
            {activeView === 'repo' && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="w-full mt-4 bg-transparent border border-matrix text-matrix py-2 rounded-sm text-[10px] font-bold uppercase hover:bg-matrix hover:text-black transition-all"
              >
                DEP_SHIP_MODULE
              </button>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="col-span-12 md:col-span-7 p-0 bg-crust flex flex-col overflow-hidden">
          {activeView === 'repo' ? (
            <div className="p-8 h-full flex flex-col overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4 shrink-0">
                <div>
                  <h2 className="text-3xl font-light text-white uppercase tracking-tighter">
                    {activeCategory === 'all' ? 'CENTRAL' : activeCategory} <span className="text-matrix">REPOSITORY</span>
                  </h2>
                  <p className="text-muted text-sm mt-1 uppercase font-mono tracking-tight">Sync specialized toolkits to your mobile environment.</p>
                </div>
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    placeholder="FIND_MODULE..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-mantle border border-edge rounded-sm px-10 py-2 text-xs font-mono text-matrix focus:outline-none focus:border-matrix w-full transition-all"
                  />
                </div>
              </div>

              {!user ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border border-dashed border-edge">
                  <Shield className="w-16 h-16 text-edge mb-6" />
                  <h3 className="text-xl font-bold text-white mb-2 uppercase italic tracking-widest">RESTRICTED ACCESS</h3>
                  <p className="text-muted text-xs max-w-xs mb-8 font-mono">YOU MUST INITIALIZE YOUR SYSTEM CREDENTIALS TO ACCESS THE MOBILE-FIRST LAB ENVIRONMENT.</p>
                  <button 
                    onClick={handleLogin}
                    className="px-8 py-3 bg-matrix text-black text-xs font-bold rounded-sm border border-matrix hover:bg-transparent hover:text-matrix transition-all shadow-[0_0_15px_rgba(0,255,65,0.2)]"
                  >
                    INITIALIZE_SYSTEM_LOGIN
                  </button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                    {filteredModules.map((module) => (
                      <div key={module.id} className="p-6 border border-edge bg-mantle relative group hover:border-matrix/40 transition-all flex flex-col justify-between">
                        <div className="text-[10px] text-muted uppercase font-bold mb-4 flex justify-between">
                          <span>TYPE: {module.category}</span>
                          <span className="text-matrix">XP_REQ: 0</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-mono text-white mb-2 leading-none uppercase group-hover:text-matrix transition-colors">{module.name}</h3>
                          <p className="text-muted text-xs leading-relaxed line-clamp-3 mb-6 font-mono opacity-80">{module.description}</p>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-edge/30">
                          <div className="text-[10px] font-mono text-muted space-x-4">
                            <span className={profile?.installedModules?.includes(module.id) ? "text-matrix" : ""}>
                              {profile?.installedModules?.includes(module.id) ? "INSTALLED" : "LOCAL_SYNC_PENDING"}
                            </span>
                            <span className="opacity-40">BY: {module.authorName.toUpperCase()}</span>
                          </div>
                          <button
                            onClick={() => handleDownload(module)}
                            className={`p-2 border transition-all rounded-sm min-w-[40px] flex items-center justify-center ${
                              installingModuleId === module.id
                              ? 'border-warning bg-warning/20 text-warning cursor-wait'
                              : profile?.installedModules?.includes(module.id)
                              ? 'border-matrix bg-matrix text-black hover:opacity-80'
                              : 'border-edge text-matrix hover:bg-matrix hover:text-black'
                            }`}
                            disabled={installingModuleId === module.id}
                          >
                            {installingModuleId === module.id ? (
                              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                                <Activity className="w-4 h-4" />
                              </motion.div>
                            ) : profile?.installedModules?.includes(module.id) ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <div className="absolute top-0 right-0 p-2 text-[#151515] font-mono text-4xl leading-none -z-0 pointer-events-none group-hover:text-edge/30 transition-colors">
                          {['01', '02', '03', '04', '05', '06'][filteredModules.indexOf(module) % 6]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="h-12 border-b border-edge bg-mantle flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                  <input 
                    value={currentScript.name} 
                    onChange={(e) => setCurrentScript({ ...currentScript, name: e.target.value })}
                    className="bg-transparent text-xs font-mono text-matrix focus:outline-none w-48 border-b border-transparent focus:border-matrix transition-all"
                  />
                  <select 
                    value={currentScript.language}
                    onChange={(e) => setCurrentScript({ ...currentScript, language: e.target.value as any })}
                    className="bg-transparent text-[10px] text-muted uppercase font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleAnalyzeCode}
                    disabled={isAnalyzing}
                    className={`flex items-center gap-2 text-[10px] font-bold uppercase transition-all px-3 py-1 rounded-sm border ${
                      isAnalyzing
                      ? 'border-muted text-muted cursor-not-allowed' 
                      : 'border-matrix/40 text-matrix/60 hover:text-matrix hover:border-matrix'
                    }`}
                  >
                    <Zap className={`w-3 h-3 ${isAnalyzing ? 'animate-bounce' : ''}`} />
                    {isAnalyzing ? 'Thinking...' : 'AI_FIX'}
                  </button>
                  <button 
                    onClick={handleSaveScript}
                    disabled={isSaving}
                    className={`flex items-center gap-2 text-[10px] font-bold uppercase transition-all px-3 py-1 rounded-sm border ${
                      isSaving 
                      ? 'border-muted text-muted cursor-not-allowed' 
                      : 'border-matrix text-matrix hover:bg-matrix hover:text-black shadow-[0_0_10px_rgba(0,255,65,0.1)]'
                    }`}
                  >
                    <Save className="w-3 h-3" />
                    {isSaving ? 'Saving...' : 'COMMIT_CHANGES'}
                  </button>
                </div>
              </div>
              
              <div className="flex-1 bg-black overflow-y-auto no-scrollbar font-mono text-xs">
                <Editor
                  value={currentScript.content || ''}
                  onValueChange={code => setCurrentScript({ ...currentScript, content: code })}
                  highlight={code => highlight(code, currentScript.language === 'python' ? languages.python : languages.javascript)}
                  padding={24}
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    minHeight: '100%',
                    fontSize: '13px'
                  }}
                  className="editor-container"
                />
                {/* AI Analysis Side Panel */}
                <AnimatePresence>
                  {aiResult && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="w-80 border-l border-edge bg-black/40 flex flex-col"
                    >
                      <div className="p-3 border-b border-edge flex items-center justify-between">
                        <span className="text-[10px] font-bold text-matrix uppercase tracking-widest flex items-center gap-2">
                          <Activity className="w-3 h-3 animate-pulse" />
                          AI_INSIGHTS
                        </span>
                        <button 
                          onClick={() => setAiResult(null)}
                          className="text-muted hover:text-white text-[10px] uppercase font-mono"
                        >
                          [close]
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-4 no-scrollbar">
                        {aiResult.split('[').filter(Boolean).map((section, idx) => {
                          const [header, ...content] = section.split(']');
                          return (
                            <div key={idx} className="space-y-2">
                              <div className="text-matrix font-bold border-b border-matrix/20 pb-1 uppercase tracking-tighter">
                                {header.trim().replace(/_/g, ' ')}
                              </div>
                              <div className="text-white/80 whitespace-pre-wrap leading-relaxed opacity-90">
                                {content.join(']').trim()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </section>

        {/* Info & Learning Panel */}
        <aside className="hidden lg:flex lg:col-span-3 bg-[#000] border-l border-edge flex-col overflow-hidden">
          <div className="p-3 border-b border-edge bg-mantle flex items-center justify-between shrink-0">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted">Active_Terminal</span>
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 rounded-full bg-matrix/40"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-matrix/20"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-matrix/10"></div>
            </div>
          </div>
          
          <TerminalEngine logs={logs} onCommand={handleCommand} />

          <div className="p-6 border-t border-edge bg-mantle shrink-0">
            <div className="text-[10px] text-muted mb-4 uppercase font-bold tracking-widest">Platform Progress</div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] mb-1 font-mono uppercase">
                  <span>Level {profile?.level || 1} System Access</span>
                  <span className="text-matrix">{(profile?.xp || 0) % 1000}/1000 XP</span>
                </div>
                <div className="w-full h-1 bg-edge rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((profile?.xp || 0) % 1000) / 10}%` }}
                    className="h-full bg-matrix shadow-[0_0_8px_#00FF41]"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-edge/10 p-3 border border-edge rounded-sm">
                  <div className="text-[9px] text-muted uppercase mb-1">Installed</div>
                  <div className="text-lg font-mono text-white">{profile?.installedModules?.length || 0}</div>
                </div>
                <div className="bg-edge/10 p-3 border border-edge rounded-sm">
                  <div className="text-[9px] text-muted uppercase mb-1">Scripts</div>
                  <div className="text-lg font-mono text-white">{scripts.length}</div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-matrix/5 border border-matrix/20 rounded-sm text-center">
              <div className="text-[9px] text-matrix uppercase mb-1 tracking-widest font-bold">Accumulated XP</div>
              <div className="text-2xl font-mono text-white tracking-widest font-light">{profile?.xp?.toLocaleString() || '0'}</div>
            </div>
          </div>
        </aside>
      </main>

      {/* Footer Status Bar */}
      <footer className="h-8 bg-matrix text-black px-6 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest shrink-0">
        <div className="flex space-x-6">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3 h-3" /> SESSION: ACTIVE
          </span>
          <span className="hidden sm:inline">ENCRYPTION: AES-256</span>
          <span className="hidden sm:inline">MOBILE_BRIDGE: STABLE</span>
        </div>
        <div className="flex items-center space-x-6">
          <span>TERMUX_V824</span>
          <span>BATT: 82%</span>
        </div>
      </footer>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className={`fixed bottom-12 right-6 z-[100] px-6 py-3 border flex items-center gap-3 backdrop-blur-md shadow-2xl ${
              toast.type === 'success' ? 'bg-matrix/10 border-matrix text-matrix' :
              toast.type === 'error' ? 'bg-danger/10 border-danger text-danger' :
              'bg-edge/10 border-edge text-white'
            }`}
          >
            <div className={`w-2 h-2 rounded-full animate-pulse ${
               toast.type === 'success' ? 'bg-matrix shadow-[0_0_8px_#00FF41]' :
               toast.type === 'error' ? 'bg-danger shadow-[0_0_8px_#FF3E3E]' :
               'bg-white shadow-[0_0_8px_#FFFFFF]'
            }`} />
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] font-mono">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-mantle border border-edge p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            >
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-matrix/10 rounded-full flex items-center justify-center mb-4 border border-matrix/20">
                  <Shield className="w-8 h-8 text-matrix animate-pulse" />
                </div>
                <h2 className="text-xl font-bold text-white uppercase tracking-[0.3em]">System_Access</h2>
                <p className="text-muted text-[10px] mt-2 font-mono uppercase tracking-widest">Initialization Protocol 7-B</p>
              </div>

              <div className="flex border-b border-edge mb-6">
                <button 
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-widest transition-all ${authMode === 'login' ? 'text-matrix border-b border-matrix' : 'text-muted hover:text-white'}`}
                >
                  SEC_LOGIN
                </button>
                <button 
                  onClick={() => setAuthMode('signup')}
                  className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-widest transition-all ${authMode === 'signup' ? 'text-matrix border-b border-matrix' : 'text-muted hover:text-white'}`}
                >
                  NEW_AGENT
                </button>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] text-muted uppercase font-bold tracking-widest ml-1">Uplink_Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-edge" />
                    <input 
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="AGENT_ID@SECURE.NET"
                      className="w-full bg-black border border-edge px-10 py-3 text-xs font-mono text-white focus:outline-none focus:border-matrix transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-muted uppercase font-bold tracking-widest ml-1">Access_Phrase</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-edge" />
                    <input 
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-black border border-edge px-10 py-3 text-xs font-mono text-white focus:outline-none focus:border-matrix transition-all"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isAuthProcessing}
                  className="w-full bg-matrix/10 border border-matrix text-matrix py-3 rounded-sm text-[11px] font-bold uppercase hover:bg-matrix hover:text-black transition-all shadow-[0_0_15px_rgba(0,255,65,0.1)] mt-2"
                >
                  {isAuthProcessing ? 'AUTHENTICATING...' : authMode === 'login' ? 'INITIALIZE_SESSION' : 'REGISTER_CREDENTIALS'}
                </button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-edge"></div></div>
                <div className="relative flex justify-center text-[9px] uppercase font-bold tracking-widest px-2 bg-mantle text-muted">OR_OAUTH_UPLINK</div>
              </div>

              <button 
                onClick={handleGoogleLogin}
                disabled={isAuthProcessing}
                className="w-full bg-transparent border border-edge text-white py-3 rounded-sm text-[11px] font-bold uppercase hover:bg-white/5 transition-all flex items-center justify-center gap-3"
              >
                <Globe className="w-4 h-4" />
                SYNC_WITH_GOOGLE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modals styles override */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUploadModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-crust border border-matrix p-8 w-full max-w-xl relative z-10 rounded-sm shadow-[0_0_50px_rgba(0,255,65,0.1)]"
            >
              <div className="flex justify-between items-center mb-8 border-b border-edge pb-4">
                <h2 className="text-2xl font-bold text-matrix uppercase tracking-tighter italic">CREATE_NEW_MODULE</h2>
                <div className="text-[10px] text-muted font-mono tracking-widest">SECURE_UPLINK</div>
              </div>
              <UploadForm 
                onClose={() => setShowUploadModal(false)} 
                onSubmit={async (data) => {
                  addLog(`INITIATING_UPLINK: ${data.name.toUpperCase()}`, 'command');
                  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
                  
                  try {
                    addLog('Encrypting data packets...', 'info');
                    await delay(1000);
                    addLog('Uploading to central node sector...', 'info');
                    
                    await uploadModule(data);
                    
                    addLog('Uplink synchronized. Integrity: 100%', 'success');
                    addLog(`New module registered in ${data.category} sector.`, 'success');
                    
                    const updated = await fetchModules(activeCategory === 'all' ? undefined : activeCategory);
                    setModules(updated);
                    setShowUploadModal(false);
                    showToast('MODULE_DEPLOYED_TO_CENTRAL_REPO', 'success');
                  } catch (e) {
                    addLog('UPLINK_REJECTED: VALIDATION_FAILURE', 'error');
                    showToast('UPLINK_REJECTED: VALIDATION_ERROR', 'error');
                  }
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UploadForm({ onClose, onSubmit }: { onClose: () => void, onSubmit: (data: any) => Promise<void> }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'development' as ModuleCategory,
    downloadUrl: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] text-muted uppercase font-bold tracking-widest ml-1">Subsystem_ID</label>
          <div className="relative">
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-matrix/40" />
            <input
              required
              type="text"
              placeholder="E.G. PACK_CORE_V1"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-black/40 border border-edge p-3 pl-10 rounded-sm text-xs font-mono text-white focus:outline-none focus:border-matrix transition-all placeholder:text-muted/20"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] text-muted uppercase font-bold tracking-widest ml-1">System_Sector</label>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-matrix/40" />
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full bg-black/40 border border-edge p-3 pl-10 rounded-sm text-xs font-mono text-matrix focus:outline-none focus:border-matrix transition-all appearance-none cursor-pointer"
            >
              {['development', 'web', 'automation', 'cybersecurity', 'ai'].map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-muted uppercase font-bold tracking-widest ml-1">Payload_Manifest</label>
        <textarea
          required
          rows={3}
          placeholder="ENTER_MODULE_CAPABILITIES_AND_DOCUMENTATION_HERE..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full bg-black/40 border border-edge p-4 rounded-sm text-xs font-mono text-white focus:outline-none focus:border-matrix transition-all resize-none placeholder:text-muted/20 no-scrollbar"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-muted uppercase font-bold tracking-widest ml-1">Remote_Uplink_URL</label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-matrix/40" />
          <input
            required
            type="url"
            placeholder="HTTPS://GITHUB.COM/DATA/PROJECT/MASTER.ZIP"
            value={formData.downloadUrl}
            onChange={(e) => setFormData({ ...formData, downloadUrl: e.target.value })}
            className="w-full bg-black/40 border border-edge p-3 pl-10 rounded-sm text-xs font-mono text-white focus:outline-none focus:border-matrix transition-all placeholder:text-muted/20"
          />
        </div>
      </div>

      <div className="flex gap-4 pt-6 border-t border-edge/30">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-transparent border border-edge text-muted py-3 rounded-sm text-[11px] font-bold uppercase hover:text-white hover:border-white transition-all tracking-widest"
        >
          {`[ ABORT_UPLINK ]`}
        </button>
        <button
          disabled={submitting}
          type="submit"
          className="flex-1 bg-matrix/10 border border-matrix text-matrix py-3 rounded-sm text-[11px] font-bold uppercase hover:bg-matrix hover:text-black disabled:opacity-50 flex items-center justify-center gap-3 transition-all shadow-[0_0_15px_rgba(0,255,65,0.1)] tracking-widest"
        >
          {submitting ? (
            <>
              <Activity className="w-4 h-4 animate-pulse" />
              COMMUNICATING...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              INITIATE_DEPLOYMENT
            </>
          )}
        </button>
      </div>
    </form>
  );
}

