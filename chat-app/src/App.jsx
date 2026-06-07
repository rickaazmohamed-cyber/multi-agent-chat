import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, X, Laptop, Smartphone, 
  Activity, ShieldAlert, CheckCheck, Lock, Inbox, Circle, RotateCcw,
  CheckCircle2, Archive, User, Mail, Plus, Globe, Search
} from 'lucide-react';

import { collection, doc, setDoc, updateDoc, addDoc, onSnapshot, query, orderBy, increment } from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const isWidgetMode = searchParams.get('mode') === 'embed';
  const siteSource = searchParams.get('site') || 'Direct Link';

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [queueFilter, setQueueFilter] = useState('active'); 
  const [viewMode, setViewMode] = useState('all'); 
  const [searchQuery, setSearchQuery] = useState('');
  
  const prevWaitingCountRef = useRef(0);

  const [isChatStarted, setIsChatStarted] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const [newAgentName, setNewAgentName] = useState('');
  const [agents, setAgents] = useState(() => {
    const savedAgents = localStorage.getItem('acme_agents_list');
    if (savedAgents) return JSON.parse(savedAgents);
    return [
      { id: 'a1', name: 'Niroshan', dept: 'Operations', color: '#10b981' }, 
      { id: 'a2', name: 'Manisha', dept: 'Support', color: '#f59e0b' },   
      { id: 'a3', name: 'Rickaaz', dept: 'Admin', color: '#8b5cf6' }
    ];
  });

  const [activeAgentId, setActiveAgentId] = useState(agents[0]?.id || 'a1');
  const activeAgent = agents.find(a => a.id === activeAgentId) || agents[0];

  const [customerSessionId, setCustomerSessionId] = useState(null);
  const [customerMessages, setCustomerMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  
  const [currentSessionData, setCurrentSessionData] = useState(null);

  const [agentSessions, setAgentSessions] = useState([]);
  const [activeAdminSessionId, setActiveAdminSessionId] = useState(null);
  const [adminMessages, setAdminMessages] = useState([]);
  const [adminReplyText, setAdminReplyText] = useState('');

  const customerMessagesEndRef = useRef(null);
  const adminMessagesEndRef = useRef(null);
  
  const customerTypingTimeoutRef = useRef(null);
  const adminTypingTimeoutRef = useRef(null);

  const config = { 
    title: 'Tours Coach Canada', 
    subtitle: 'We typically reply in minutes', 
    primaryColor: '#2563eb' 
  };

  // === NEW: TELL THE PARENT WEBSITE IF WIDGET IS OPEN OR CLOSED ===
  useEffect(() => {
    if (isWidgetMode) {
      // Broadcast the open/closed state to the parent window
      window.parent.postMessage({ type: 'CHAT_WIDGET_STATE', isOpen: isWidgetOpen }, '*');
    }
  }, [isWidgetOpen, isWidgetMode]);

  const handleAddAgent = (e) => {
    e.preventDefault();
    if (!newAgentName.trim()) return;
    const colors = ['#ef4444', '#06b6d4', '#d946ef', '#f43f5e', '#84cc16', '#eab308', '#6366f1'];
    const newAgent = { id: 'a' + Date.now(), name: newAgentName.trim(), dept: 'Support', color: colors[agents.length % colors.length] };
    const updatedAgents = [...agents, newAgent];
    setAgents(updatedAgents);
    localStorage.setItem('acme_agents_list', JSON.stringify(updatedAgents));
    setNewAgentName('');
    showToast(`Added agent: ${newAgent.name}`);
  };

  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode); gainNode.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2); 
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
    } catch (e) { console.warn("Audio play blocked."); }
  };

  useEffect(() => {
    const savedEmail = localStorage.getItem('acme_chat_email');
    const savedName = localStorage.getItem('acme_chat_name');
    if (savedEmail) {
      setCustomerEmail(savedEmail);
      setCustomerName(savedName || 'Guest');
      setCustomerSessionId(savedEmail); 
      setIsChatStarted(true);
    }
  }, []);

  const handleResetSession = () => { 
    localStorage.removeItem('acme_chat_email'); 
    localStorage.removeItem('acme_chat_name'); 
    window.location.reload(); 
  };

  const handleStartChat = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerEmail.trim()) return;

    const emailId = customerEmail.toLowerCase().trim();
    localStorage.setItem('acme_chat_email', emailId);
    localStorage.setItem('acme_chat_name', customerName.trim());
    
    setCustomerSessionId(emailId);
    setIsChatStarted(true);

    try {
      const sessionRef = doc(db, 'sessions', emailId);
      await setDoc(sessionRef, { 
        customerName: customerName.trim(), customerEmail: emailId, source: siteSource, 
        status: 'waiting', updatedAt: Date.now(), lastMessage: "Started a new chat session.",
        unreadAdmin: 1, unreadUser: 0, userTyping: false, agentTyping: false
      }, { merge: true });
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (!customerSessionId || !isWidgetMode) return;
    const unsubscribe = onSnapshot(doc(db, 'sessions', customerSessionId), (docSnap) => {
      if (docSnap.exists()) setCurrentSessionData(docSnap.data());
    });
    return () => unsubscribe();
  }, [customerSessionId, isWidgetMode]);

  useEffect(() => {
    if (isWidgetMode && isWidgetOpen && customerSessionId && currentSessionData?.unreadUser > 0) {
      updateDoc(doc(db, 'sessions', customerSessionId), { unreadUser: 0 });
    }
  }, [isWidgetOpen, currentSessionData, customerSessionId, isWidgetMode]);

  useEffect(() => {
    if (!isWidgetMode && activeAdminSessionId) {
      const activeSession = agentSessions.find(s => s.id === activeAdminSessionId);
      if (activeSession && activeSession.unreadAdmin > 0) {
        updateDoc(doc(db, 'sessions', activeAdminSessionId), { unreadAdmin: 0 });
      }
    }
  }, [activeAdminSessionId, agentSessions, isWidgetMode]);

  useEffect(() => {
    if (!customerSessionId) return;
    const q = query(collection(db, `sessions/${customerSessionId}/messages`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedMsgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setCustomerMessages(fetchedMsgs);
      setTimeout(() => customerMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, [customerSessionId]);

  useEffect(() => {
    if (!isAuthenticated || isWidgetMode) return; 
    const q = query(collection(db, 'sessions'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAgentSessions(sessions);
      const currentWaitingCount = sessions.filter(s => s.status === 'waiting').length;
      if (currentWaitingCount > prevWaitingCountRef.current) playNotificationSound();
      prevWaitingCountRef.current = currentWaitingCount;
    });
    return () => unsubscribe();
  }, [isAuthenticated, isWidgetMode]);

  useEffect(() => {
    if (!activeAdminSessionId) return;
    const q = query(collection(db, `sessions/${activeAdminSessionId}/messages`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedMsgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setAdminMessages(fetchedMsgs);
      setTimeout(() => adminMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, [activeAdminSessionId]);

  const showToast = (message, type = 'success') => {
    const id = Date.now(); setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  };

  const handleCustomerTyping = (e) => {
    setUserInput(e.target.value);
    if (!customerSessionId) return;
    updateDoc(doc(db, 'sessions', customerSessionId), { userTyping: true });
    clearTimeout(customerTypingTimeoutRef.current);
    customerTypingTimeoutRef.current = setTimeout(() => {
      updateDoc(doc(db, 'sessions', customerSessionId), { userTyping: false });
    }, 2000);
  };

  const handleCustomerSend = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || !customerSessionId) return;
    const text = userInput.trim();
    setUserInput('');
    clearTimeout(customerTypingTimeoutRef.current);
    try {
      await setDoc(doc(db, 'sessions', customerSessionId), { 
        status: 'waiting', lastMessage: text, updatedAt: Date.now(), 
        userTyping: false, unreadAdmin: increment(1) 
      }, { merge: true });
      await addDoc(collection(db, `sessions/${customerSessionId}/messages`), { text, sender: 'user', createdAt: Date.now(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    } catch (err) { showToast("Error.", "error"); }
  };

  const handleAdminTyping = (e) => {
    setAdminReplyText(e.target.value);
    if (!activeAdminSessionId) return;
    updateDoc(doc(db, 'sessions', activeAdminSessionId), { agentTyping: true });
    clearTimeout(adminTypingTimeoutRef.current);
    adminTypingTimeoutRef.current = setTimeout(() => {
      updateDoc(doc(db, 'sessions', activeAdminSessionId), { agentTyping: false });
    }, 2000);
  };

  const handleAdminSend = async (e) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !activeAdminSessionId) return;
    const text = adminReplyText.trim();
    setAdminReplyText('');
    clearTimeout(adminTypingTimeoutRef.current);
    try {
      await updateDoc(doc(db, 'sessions', activeAdminSessionId), { 
        status: 'active', assignedAgent: activeAgent, lastMessage: `Agent: ${text}`, updatedAt: Date.now(), 
        agentTyping: false, unreadUser: increment(1) 
      });
      await addDoc(collection(db, `sessions/${activeAdminSessionId}/messages`), { text, sender: 'agent', agentDetails: activeAgent, createdAt: Date.now(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    } catch (err) { showToast("Error.", "error"); }
  };

  const handleResolveSession = async () => {
    if (!activeAdminSessionId) return;
    try {
      await updateDoc(doc(db, 'sessions', activeAdminSessionId), { status: 'resolved', updatedAt: Date.now(), unreadAdmin: 0, userTyping: false, agentTyping: false });
      setActiveAdminSessionId(null); 
    } catch (err) { showToast("Error.", "error"); }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === 'admin123') { setIsAuthenticated(true); } else { setLoginError(true); showToast("Invalid passcode.", "error"); }
  };

  const displayedSessions = agentSessions.filter(s => {
    const statusMatch = queueFilter === 'active' ? (s.status === 'waiting' || s.status === 'active') : s.status === 'resolved';
    let agentMatch = true;
    if (viewMode !== 'all') { agentMatch = s.assignedAgent && s.assignedAgent.id === viewMode; }
    const searchMatch = searchQuery === '' || (s.customerName && s.customerName.toLowerCase().includes(searchQuery.toLowerCase())) || (s.customerEmail && s.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()));
    return statusMatch && agentMatch && searchMatch;
  });

  if (isWidgetMode) {
    return (
      <div className="w-screen h-screen flex flex-col justify-end items-end p-4 bg-transparent font-sans overflow-hidden">
        {isWidgetOpen ? (
          <div className="w-full max-w-[340px] h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-4">
            
            <div style={{ backgroundColor: config.primaryColor }} className="p-4 text-white flex justify-between items-center shrink-0 z-10 shadow-md">
              <div><h4 className="font-bold text-sm tracking-wide">{config.title}</h4><span className="text-[10px] text-white/90">{config.subtitle}</span></div>
              <button onClick={() => setIsWidgetOpen(false)} className="hover:bg-black/10 p-1 rounded-full transition"><X className="h-5 w-5" /></button>
            </div>

            {!isChatStarted ? (
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50 flex flex-col justify-center">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg">Welcome!</h3>
                  <p className="text-xs text-slate-500 mt-1">Please enter your details to start chatting with an agent.</p>
                </div>

                <form onSubmit={handleStartChat} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Your Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} 
                        placeholder="John Doe" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                        className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="email" required value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} 
                        placeholder="john@example.com" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                        className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                      />
                    </div>
                  </div>
                  <button type="submit" style={{ backgroundColor: config.primaryColor }} className="w-full py-3 rounded-xl text-white font-bold text-sm shadow-md hover:opacity-90 transition mt-2">
                    Start Chat
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 relative">
                  {customerMessages.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center opacity-60">
                      <MessageSquare className="h-10 w-10 text-slate-400 mb-3" />
                      <p className="text-xs text-slate-500">Have a question? Send us a message and an agent will be with you shortly.</p>
                    </div>
                  )}
                  {customerMessages.map((m) => (
                    <div key={m.id} className={`flex gap-2 max-w-[88%] ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                      {m.sender === 'agent' && <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm mt-auto mb-1" style={{ backgroundColor: m.agentDetails?.color }}>{m.agentDetails?.name?.charAt(0)}</div>}
                      <div>
                        {m.sender === 'agent' && <span className="text-[10px] text-slate-500 ml-1 mb-1 block font-medium">{m.agentDetails?.name}</span>}
                        <div className={`p-3 text-sm shadow-sm ${m.sender === 'user' ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm' : 'bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-bl-sm'}`}>{m.text}</div>
                      </div>
                    </div>
                  ))}
                  
                  {currentSessionData?.agentTyping && (
                    <div className="flex gap-2 max-w-[88%] mr-auto">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm mt-auto mb-1 bg-slate-300">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 ml-1 mb-1 block font-medium">Agent is typing...</span>
                        <div className="p-3 text-sm shadow-sm bg-white border border-slate-100 rounded-2xl rounded-bl-sm flex gap-1 items-center h-10">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={customerMessagesEndRef} />
                </div>
                
                <div className="bg-slate-50 px-4 pb-2 flex justify-between items-center">
                  <span className="text-[9px] text-slate-400">Logged in as {customerEmail}</span>
                  <button onClick={handleResetSession} className="text-[9px] text-rose-500 hover:underline">Sign Out</button>
                </div>

                <form onSubmit={handleCustomerSend} className="p-3 border-t bg-white flex gap-2 shrink-0">
                  <input type="text" value={userInput} onChange={handleCustomerTyping} placeholder="Type a message..." style={{ color: '#0f172a', backgroundColor: '#f8fafc' }} className="flex-1 text-sm px-4 py-2.5 rounded-full border border-slate-200 focus:outline-none focus:border-blue-500" />
                  <button type="submit" style={{ backgroundColor: config.primaryColor }} className="h-10 w-10 rounded-full text-white flex items-center justify-center shadow-md hover:scale-105 transition-transform"><Send className="h-4 w-4 ml-0.5" /></button>
                </form>
              </>
            )}
          </div>
        ) : (
          <button onClick={() => setIsWidgetOpen(true)} style={{ backgroundColor: config.primaryColor }} className="w-16 h-16 rounded-full text-white shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex items-center justify-center hover:scale-105 transition-transform relative group">
            {currentSessionData?.unreadUser > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white">
                {currentSessionData.unreadUser}
              </span>
            )}
            <MessageSquare className="h-7 w-7 group-hover:hidden" />
            <Activity className="h-7 w-7 hidden group-hover:block" />
          </button>
        )}
      </div>
    );
  }

  // ==========================================
  // FULL DASHBOARD RENDER 
  // ==========================================
  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {notifications.map((notif) => (
          <div key={notif.id} className="p-3 rounded-lg shadow-xl border flex items-center gap-3 bg-slate-900 border-slate-700 text-sm">
            {notif.type === 'error' && <ShieldAlert className="h-5 w-5 text-rose-400" />}
            {notif.type === 'success' && <CheckCheck className="h-5 w-5 text-emerald-400" />}
            <div>{notif.message}</div>
          </div>
        ))}
      </div>

      {!isAuthenticated ? (
        <div className="flex items-center justify-center w-full h-full bg-slate-900 relative">
            <div className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-center text-white mb-6">Agent Restricted Area</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <input 
                  type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Passcode..."
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition text-sm">
                  Unlock Dashboard
                </button>
              </form>
            </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col relative">
            
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
                  <Inbox className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="font-bold text-lg">Support Inbox Queue</h1>
                  <p className="text-xs text-slate-400">Manage multiple customer sessions</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-b border-slate-800 bg-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2 flex-1">
                <button onClick={() => setViewMode('all')} className={`px-4 py-2 rounded border text-xs font-medium transition ${viewMode === 'all' ? 'bg-slate-800 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`} style={{ borderBottomColor: viewMode === 'all' ? '#3b82f6' : '' }}>All Chats</button>
                {agents.map(agent => (
                   <button key={agent.id} onClick={() => { setViewMode(agent.id); setActiveAgentId(agent.id); }} className={`px-4 py-2 rounded border text-xs font-medium transition ${viewMode === agent.id ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`} style={{ borderBottomColor: viewMode === agent.id ? agent.color : '' }}>{agent.name}</button>
                ))}
              </div>

              <form onSubmit={handleAddAgent} className="flex gap-2 shrink-0">
                 <input type="text" value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} placeholder="New agent name..." className="bg-slate-900 border border-slate-700 text-white text-xs px-3 py-2 rounded focus:outline-none focus:border-blue-500 w-36" />
                 <button type="submit" className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-2 rounded transition flex items-center justify-center" title="Add Agent"><Plus className="w-4 h-4" /></button>
              </form>
            </div>
            
            {viewMode === 'all' && (
              <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800 flex items-center gap-1">
                <p className="text-[10px] text-slate-500 flex items-center gap-1"><Inbox className="w-3 h-3" /> Viewing all queues. Agent replies will be sent as <strong style={{color: activeAgent.color}}>{activeAgent.name}</strong>.</p>
              </div>
            )}

            <div className="flex-1 flex overflow-hidden">
              <div className="w-1/3 md:w-80 border-r border-slate-800 bg-slate-900 flex flex-col shrink-0">
                
                <div className="p-3 border-b border-slate-800 bg-slate-900 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="text" placeholder="Search name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-600" />
                    {searchQuery && (<button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"><X className="w-3 h-3" /></button>)}
                  </div>
                </div>

                <div className="flex border-b border-slate-800 bg-slate-950 shrink-0">
                  <button onClick={() => setQueueFilter('active')} className={`flex-1 py-3 text-xs font-medium border-b-2 transition ${queueFilter === 'active' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Waiting & Active</button>
                  <button onClick={() => setQueueFilter('resolved')} className={`flex-1 py-3 text-xs font-medium border-b-2 transition ${queueFilter === 'resolved' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Resolved</button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {displayedSessions.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 mt-10">{searchQuery ? 'No chats match your search.' : `No ${queueFilter} chats available.`}</div>
                  ) : (
                    displayedSessions.map(session => (
                      <button
                        key={session.id}
                        onClick={() => setActiveAdminSessionId(session.id)}
                        className={`w-full text-left p-4 border-b border-slate-800 transition hover:bg-slate-800 ${activeAdminSessionId === session.id ? 'bg-slate-800 border-l-2 border-l-blue-500' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-white truncate max-w-[150px]">
                            {session.customerName || session.id}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            {session.unreadAdmin > 0 && (
                              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {session.unreadAdmin}
                              </span>
                            )}
                            {session.status === 'waiting' && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span>}
                            {session.status === 'active' && <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />}
                            {session.status === 'resolved' && <CheckCircle2 className="h-3 w-3 text-slate-500" />}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] text-slate-400 truncate font-mono">{session.customerEmail || 'Guest User'}</p>
                          {session.source && (<span className="bg-blue-900/40 text-blue-300 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border border-blue-800/50 flex items-center gap-1"><Globe className="w-2.5 h-2.5" /> {session.source}</span>)}
                        </div>

                        {session.userTyping ? (
                          <p className="text-xs text-blue-400 italic bg-slate-950 p-2 rounded-lg border border-slate-800">Typing...</p>
                        ) : (
                          <p className="text-xs text-slate-300 truncate bg-slate-950 p-2 rounded-lg border border-slate-800">
                            {session.lastMessage || 'Started chat...'}
                          </p>
                        )}

                        {session.assignedAgent && (<p className="text-[9px] text-slate-500 mt-2">Handled by: {session.assignedAgent.name}</p>)}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="flex-1 bg-slate-950 flex flex-col relative min-w-0">
                {!activeAdminSessionId ? (
                  <div className="m-auto text-center text-slate-500 flex flex-col items-center gap-2">
                    <MessageSquare className="h-10 w-10 opacity-20" />
                    <p className="text-sm">Select a customer session from the queue.</p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-200">
                          Chatting with: <span className="text-blue-400">{agentSessions.find(s => s.id === activeAdminSessionId)?.customerName || activeAdminSessionId}</span>
                        </span>
                        {agentSessions.find(s => s.id === activeAdminSessionId)?.source && (
                          <span className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                            Via <Globe className="w-3 h-3" /> {agentSessions.find(s => s.id === activeAdminSessionId)?.source}
                          </span>
                        )}
                      </div>
                      
                      <button 
                        onClick={handleResolveSession}
                        className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-emerald-900/50 hover:text-emerald-400 text-slate-300 px-3 py-1.5 rounded transition border border-slate-700 hover:border-emerald-800"
                        title="Mark session as resolved"
                      >
                        <Archive className="h-3 w-3" /> Resolve
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {adminMessages.map((m) => (
                        <div key={m.id} className={`flex flex-col max-w-[85%] ${m.sender === 'user' ? 'mr-auto items-start' : 'ml-auto items-end'}`}>
                          <span className="text-[10px] text-slate-500 mb-1 font-medium">
                            {m.sender === 'user' ? (agentSessions.find(s => s.id === activeAdminSessionId)?.customerName || 'Client') : `${m.agentDetails?.name}`}
                          </span>
                          <div className={`p-3 rounded-xl text-sm ${m.sender === 'user' ? 'bg-slate-800 text-slate-200' : 'bg-blue-900/40 text-blue-100 border border-blue-800'}`}>
                            {m.text}
                          </div>
                        </div>
                      ))}
                      
                      {agentSessions.find(s => s.id === activeAdminSessionId)?.userTyping && (
                         <div className="flex flex-col max-w-[85%] mr-auto items-start">
                           <span className="text-[10px] text-slate-500 mb-1 font-medium italic">
                             {agentSessions.find(s => s.id === activeAdminSessionId)?.customerName} is typing...
                           </span>
                           <div className="p-3 rounded-xl bg-slate-800 flex gap-1 items-center h-10">
                             <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                             <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                             <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                           </div>
                         </div>
                      )}
                      
                      <div ref={adminMessagesEndRef} />
                    </div>

                    <form onSubmit={handleAdminSend} className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2 shrink-0">
                      <input 
                        type="text" value={adminReplyText} onChange={handleAdminTyping}
                        placeholder="Type reply..."
                        className="flex-1 text-sm bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      />
                      <button type="submit" className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-500 rounded-lg transition font-medium text-sm">Send</button>
                    </form>
                  </>
                )}
              </div>

            </div>
        </div>
      )}
    </div>
  );
}