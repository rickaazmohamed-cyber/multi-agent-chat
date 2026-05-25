import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Settings, Code, Send, X, Laptop, Smartphone, User, 
  Copy, Check, Activity, Bell, ShieldAlert, CheckCheck, Clock, Lock, Key, Inbox, Circle
} from 'lucide-react';

// === FIREBASE IMPORTS ===
import { collection, doc, setDoc, updateDoc, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  // === AUTH & UI STATES ===
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('agent');
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [notifications, setNotifications] = useState([]);

  // === MULTI-AGENT ROSTER ===
  const agents = [
    { id: 'a1', name: 'Sarah', dept: 'Technical Support', color: '#10b981' }, 
    { id: 'a2', name: 'Marcus', dept: 'Billing & Sales', color: '#f59e0b' },   
    { id: 'a3', name: 'Chloe', dept: 'Customer Success', color: '#8b5cf6' }    
  ];
  const [activeAgentId, setActiveAgentId] = useState(agents[0].id);
  const activeAgent = agents.find(a => a.id === activeAgentId);

  // === SESSION & MESSAGING STATES ===
  const [customerSessionId, setCustomerSessionId] = useState(null);
  const [customerMessages, setCustomerMessages] = useState([]);
  const [userInput, setUserInput] = useState('');

  const [agentSessions, setAgentSessions] = useState([]);
  const [activeAdminSessionId, setActiveAdminSessionId] = useState(null);
  const [adminMessages, setAdminMessages] = useState([]);
  const [adminReplyText, setAdminReplyText] = useState('');

  const customerMessagesEndRef = useRef(null);
  const adminMessagesEndRef = useRef(null);

  // Widget config
  const config = {
    title: 'Acme Live Support',
    subtitle: 'We typically reply in minutes',
    primaryColor: '#2563eb'
  };

  // ==========================================
  // 1. CUSTOMER LOGIC: Initialize Session
  // ==========================================
  useEffect(() => {
    // Check if customer already has a chat session saved in their browser
    let sid = localStorage.getItem('acme_chat_session');
    if (!sid) {
      // Generate a new one if they don't
      sid = 'sess_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('acme_chat_session', sid);
    }
    setCustomerSessionId(sid);
  }, []);

  // Listen to Customer's specific message feed
  useEffect(() => {
    if (!customerSessionId) return;
    const q = query(collection(db, `sessions/${customerSessionId}/messages`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCustomerMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => customerMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, [customerSessionId]);

  // ==========================================
  // 2. AGENT LOGIC: Inbox Queue & Active Chat
  // ==========================================
  
  // Listen to all chat sessions for the Inbox Queue
  useEffect(() => {
    if (!isAuthenticated) return;
    const q = query(collection(db, 'sessions'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAgentSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [isAuthenticated]);

  // Listen to messages for the specific chat the agent clicked on
  useEffect(() => {
    if (!activeAdminSessionId) return;
    const q = query(collection(db, `sessions/${activeAdminSessionId}/messages`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAdminMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => adminMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, [activeAdminSessionId]);


  // ==========================================
  // 3. SENDING MESSAGES
  // ==========================================
  
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  };

  const handleCustomerSend = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || !customerSessionId) return;

    const text = userInput.trim();
    setUserInput('');

    try {
      // 1. Update/Create the session document (for the agent inbox to see)
      const sessionRef = doc(db, 'sessions', customerSessionId);
      await setDoc(sessionRef, {
        status: 'waiting', // Flags this for agents as needing attention
        lastMessage: text,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 2. Add the actual message to the sub-collection
      await addDoc(collection(db, `sessions/${customerSessionId}/messages`), {
        text: text,
        sender: 'user',
        createdAt: serverTimestamp(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } catch (err) {
      console.error(err);
      showToast("Failed to send.", "error");
    }
  };

  const handleAdminSend = async (e) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !activeAdminSessionId) return;

    const text = adminReplyText.trim();
    setAdminReplyText('');

    try {
      // 1. Update session to show it's being handled
      const sessionRef = doc(db, 'sessions', activeAdminSessionId);
      await updateDoc(sessionRef, {
        status: 'active',
        assignedAgent: activeAgent,
        lastMessage: `Agent: ${text}`,
        updatedAt: serverTimestamp()
      });

      // 2. Send message
      await addDoc(collection(db, `sessions/${activeAdminSessionId}/messages`), {
        text: text,
        sender: 'agent',
        agentDetails: activeAgent,
        createdAt: serverTimestamp(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } catch (err) {
      console.error(err);
      showToast("Failed to send reply.", "error");
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === 'admin123') {
      setIsAuthenticated(true);
      setLoginError(false);
      showToast("Access Granted.", "success");
    } else {
      setLoginError(true);
      setPasswordInput('');
      showToast("Invalid passcode.", "error");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {notifications.map((notif) => (
          <div key={notif.id} className="p-3 rounded-lg shadow-xl border flex items-center gap-3 bg-slate-900 border-slate-700 text-sm">
            {notif.type === 'error' && <ShieldAlert className="h-5 w-5 text-rose-400" />}
            {notif.type === 'success' && <CheckCheck className="h-5 w-5 text-emerald-400" />}
            <div>{notif.message}</div>
          </div>
        ))}
      </div>

      {/* ==========================================
          LEFT PANE: ADMIN DASHBOARD
         ========================================== */}
      <div className="w-full lg:w-[55%] h-full flex flex-col border-r border-slate-800 bg-slate-900 relative">
        
        {!isAuthenticated ? (
          // LOGIN SCREEN
          <div className="absolute inset-0 z-10 bg-slate-900 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-2xl p-8 shadow-2xl">
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
          // DASHBOARD
          <>
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

            {/* Agent Selector */}
            <div className="p-4 border-b border-slate-800 bg-slate-950">
              <div className="flex gap-2 max-w-md">
                {agents.map(agent => (
                   <button
                   key={agent.id}
                   onClick={() => setActiveAgentId(agent.id)}
                   className={`flex-1 p-2 rounded border text-xs font-medium transition ${activeAgentId === agent.id ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                   style={{ borderBottomColor: activeAgentId === agent.id ? agent.color : '' }}
                 >
                   {agent.name}
                 </button>
                ))}
              </div>
            </div>

            {/* TWO-COLUMN INBOX LAYOUT */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Left Column: Session List */}
              <div className="w-2/5 border-r border-slate-800 bg-slate-900 overflow-y-auto">
                {agentSessions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 mt-10">No active chats in the queue.</div>
                ) : (
                  agentSessions.map(session => (
                    <button
                      key={session.id}
                      onClick={() => setActiveAdminSessionId(session.id)}
                      className={`w-full text-left p-4 border-b border-slate-800 transition hover:bg-slate-800 ${activeAdminSessionId === session.id ? 'bg-slate-800 border-l-2 border-l-blue-500' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-slate-300">#{session.id.substring(5, 11)}</span>
                        {session.status === 'waiting' && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span>}
                        {session.status === 'active' && <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{session.lastMessage || 'Started chat...'}</p>
                      {session.assignedAgent && (
                        <p className="text-[9px] text-slate-500 mt-2">Handled by: {session.assignedAgent.name}</p>
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Right Column: Active Chat View */}
              <div className="w-3/5 bg-slate-950 flex flex-col relative">
                {!activeAdminSessionId ? (
                  <div className="m-auto text-center text-slate-500 flex flex-col items-center gap-2">
                    <MessageSquare className="h-10 w-10 opacity-20" />
                    <p className="text-sm">Select a customer session from the queue.</p>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
                      <span className="text-xs font-semibold text-slate-200">Chat Session: #{activeAdminSessionId.substring(5, 11)}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {adminMessages.map((m) => (
                        <div key={m.id} className={`flex flex-col max-w-[85%] ${m.sender === 'user' ? 'mr-auto items-start' : 'ml-auto items-end'}`}>
                          <span className="text-[10px] text-slate-500 mb-1 font-medium">
                            {m.sender === 'user' ? 'Client' : `${m.agentDetails?.name}`}
                          </span>
                          <div className={`p-3 rounded-lg text-xs ${m.sender === 'user' ? 'bg-slate-800 text-slate-200' : 'bg-blue-900/40 text-blue-100 border border-blue-800'}`}>
                            {m.text}
                          </div>
                        </div>
                      ))}
                      <div ref={adminMessagesEndRef} />
                    </div>

                    <form onSubmit={handleAdminSend} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 shrink-0">
                      <input 
                        type="text" value={adminReplyText} onChange={(e) => setAdminReplyText(e.target.value)}
                        placeholder="Type reply..."
                        className="flex-1 text-xs bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                      <button type="submit" className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 rounded transition font-medium text-xs">Send</button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ==========================================
          RIGHT PANE: SIMULATED CLIENT WEBSITE
         ========================================== */}
      <div className="flex-1 h-full flex flex-col bg-slate-900">
        <div className="p-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex gap-1">
            <button onClick={() => setPreviewDevice('desktop')} className={`p-2 rounded ${previewDevice === 'desktop' ? 'bg-slate-800 text-blue-400' : 'text-slate-500'}`}><Laptop className="h-4 w-4" /></button>
            <button onClick={() => setPreviewDevice('mobile')} className={`p-2 rounded ${previewDevice === 'mobile' ? 'bg-slate-800 text-blue-400' : 'text-slate-500'}`}><Smartphone className="h-4 w-4" /></button>
          </div>
          <div className="text-xs text-emerald-400 flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Firebase Synced</div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-950 p-6 flex items-center justify-center">
          <div className={`transition-all bg-slate-50 relative border border-slate-700 shadow-2xl rounded-xl flex flex-col overflow-hidden ${previewDevice === 'desktop' ? 'w-full h-full max-w-5xl' : 'w-[360px] h-[640px]'}`}>
            
            <div className="flex-1 p-10 text-center">
              <h2 className="text-3xl font-black text-slate-800 mb-4">Your Business Website</h2>
              <p className="text-slate-500 max-w-md mx-auto mb-4">Type a message below. It will automatically generate your unique Customer ID and place you in the Agent Queue on the left!</p>
              {customerSessionId && <span className="text-xs font-mono bg-slate-200 text-slate-600 px-2 py-1 rounded">Your ID: #{customerSessionId.substring(5, 11)}</span>}
            </div>

            <div className="absolute right-6 bottom-6 z-40">
              {isWidgetOpen ? (
                <div className="w-[320px] h-[460px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
                  
                  <div style={{ backgroundColor: config.primaryColor }} className="p-4 text-white flex justify-between items-center shrink-0">
                    <div>
                      <h4 className="font-bold text-sm">{config.title}</h4>
                      <span className="text-[10px] text-white/80">{config.subtitle}</span>
                    </div>
                    <button onClick={() => setIsWidgetOpen(false)}><X className="h-5 w-5" /></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                    {customerMessages.length === 0 && <p className="text-xs text-center text-slate-400 mt-4">Send a message to start chatting.</p>}
                    
                    {customerMessages.map((m) => (
                      <div key={m.id} className={`flex gap-2 max-w-[85%] ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                        {m.sender === 'agent' && (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white shadow" style={{ backgroundColor: m.agentDetails?.color || '#000' }}>
                            {m.agentDetails?.name?.charAt(0) || 'A'}
                          </div>
                        )}
                        <div>
                          {m.sender === 'agent' && <span className="text-[9px] text-slate-400 ml-1 mb-0.5 block">{m.agentDetails?.name}</span>}
                          <div className={`p-3 rounded-2xl text-xs ${m.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border text-slate-800 rounded-tl-none shadow-sm'}`}>
                            {m.text}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={customerMessagesEndRef} />
                  </div>

                  <form onSubmit={handleCustomerSend} className="p-3 border-t bg-white flex gap-2 shrink-0">
<input 
  type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)}
  placeholder="Type your message..."
  className="flex-1 text-black bg-white text-xs px-3 py-2 rounded border border-slate-200 focus:outline-none focus:border-blue-500"
/>
                    <button type="submit" style={{ backgroundColor: config.primaryColor }} className="p-2 rounded text-white"><Send className="h-4 w-4" /></button>
                  </form>
                </div>
              ) : (
                <button 
                  onClick={() => setIsWidgetOpen(true)}
                  style={{ backgroundColor: config.primaryColor }}
                  className="w-14 h-14 rounded-full text-white shadow-2xl flex items-center justify-center hover:scale-105 transition"
                >
                  <MessageSquare className="h-6 w-6" />
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}