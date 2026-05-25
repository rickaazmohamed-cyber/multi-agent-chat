import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, X, Laptop, Smartphone, 
  Activity, ShieldAlert, CheckCheck, Lock, Inbox, Circle, RotateCcw,
  CheckCircle2, Archive
} from 'lucide-react';

import { collection, doc, setDoc, updateDoc, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  const isWidgetMode = new URLSearchParams(window.location.search).get('mode') === 'embed';

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [queueFilter, setQueueFilter] = useState('active'); 
  const prevWaitingCountRef = useRef(0);

  const agents = [
    { id: 'a1', name: 'Sarah', dept: 'Technical Support', color: '#10b981' }, 
    { id: 'a2', name: 'Marcus', dept: 'Billing & Sales', color: '#f59e0b' },   
    { id: 'a3', name: 'Chloe', dept: 'Customer Success', color: '#8b5cf6' }    
  ];
  const [activeAgentId, setActiveAgentId] = useState(agents[0].id);
  const activeAgent = agents.find(a => a.id === activeAgentId);

  const [customerSessionId, setCustomerSessionId] = useState(null);
  const [customerMessages, setCustomerMessages] = useState([]);
  const [userInput, setUserInput] = useState('');

  const [agentSessions, setAgentSessions] = useState([]);
  const [activeAdminSessionId, setActiveAdminSessionId] = useState(null);
  const [adminMessages, setAdminMessages] = useState([]);
  const [adminReplyText, setAdminReplyText] = useState('');

  const customerMessagesEndRef = useRef(null);
  const adminMessagesEndRef = useRef(null);

  const config = { title: 'Acme Live Support', subtitle: 'We typically reply in minutes', primaryColor: '#2563eb' };

  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2); 
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) { console.warn("Audio play blocked."); }
  };

  useEffect(() => {
    let sid = localStorage.getItem('acme_chat_session');
    if (!sid) { sid = 'sess_' + Math.random().toString(36).substring(2, 10); localStorage.setItem('acme_chat_session', sid); }
    setCustomerSessionId(sid);
  }, []);

  const handleResetSession = () => { localStorage.removeItem('acme_chat_session'); window.location.reload(); };

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
      await setDoc(doc(db, 'sessions', customerSessionId), { status: 'waiting', lastMessage: text, updatedAt: Date.now() }, { merge: true });
      await addDoc(collection(db, `sessions/${customerSessionId}/messages`), { text, sender: 'user', createdAt: Date.now(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    } catch (err) { showToast("Error.", "error"); }
  };

  const handleAdminSend = async (e) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !activeAdminSessionId) return;
    const text = adminReplyText.trim();
    setAdminReplyText('');
    try {
      await updateDoc(doc(db, 'sessions', activeAdminSessionId), { status: 'active', assignedAgent: activeAgent, lastMessage: `Agent: ${text}`, updatedAt: Date.now() });
      await addDoc(collection(db, `sessions/${activeAdminSessionId}/messages`), { text, sender: 'agent', agentDetails: activeAgent, createdAt: Date.now(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    } catch (err) { showToast("Error.", "error"); }
  };

  const handleResolveSession = async () => {
    if (!activeAdminSessionId) return;
    try {
      await updateDoc(doc(db, 'sessions', activeAdminSessionId), { status: 'resolved', updatedAt: Date.now() });
      setActiveAdminSessionId(null); 
    } catch (err) { showToast("Error.", "error"); }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === 'admin123') { setIsAuthenticated(true); } else { setLoginError(true); showToast("Invalid passcode.", "error"); }
  };

  const displayedSessions = agentSessions.filter(s => queueFilter === 'active' ? (s.status === 'waiting' || s.status === 'active') : s.status === 'resolved');

  if (isWidgetMode) {
    return (
      <div className="w-screen h-screen flex flex-col justify-end items-end p-4 bg-transparent font-sans overflow-hidden">
        {isWidgetOpen ? (
          <div className="w-full max-w-[340px] h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-4">
            <div style={{ backgroundColor: config.primaryColor }} className="p-4 text-white flex justify-between items-center shrink-0 z-10">
              <div><h4 className="font-bold text-sm">{config.title}</h4><span className="text-[10px] text-white/90">{config.subtitle}</span></div>
              <button onClick={() => setIsWidgetOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {customerMessages.map((m) => (
                <div key={m.id} className={`flex gap-2 max-w-[88%] ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                  {m.sender === 'agent' && <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm mt-auto" style={{ backgroundColor: m.agentDetails?.color }}>{m.agentDetails?.name?.charAt(0)}</div>}
                  <div className={`p-3 text-sm shadow-sm ${m.sender === 'user' ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm' : 'bg-white border text-slate-800 rounded-2xl'}`}>{m.text}</div>
                </div>
              ))}
              <div ref={customerMessagesEndRef} />
            </div>
            <form onSubmit={handleCustomerSend} className="p-3 border-t bg-white flex gap-2 shrink-0">
              <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Type..." style={{ color: '#000', backgroundColor: '#fff' }} className="flex-1 text-sm px-4 py-2 rounded-full border border-slate-200 focus:outline-none focus:border-blue-500" />
              <button type="submit" style={{ backgroundColor: config.primaryColor }} className="h-10 w-10 rounded-full text-white flex items-center justify-center"><Send className="h-4 w-4" /></button>
            </form>
          </div>
        ) : (
          <button onClick={() => setIsWidgetOpen(true)} style={{ backgroundColor: config.primaryColor }} className="w-16 h-16 rounded-full text-white shadow-xl flex items-center justify-center hover:scale-105 transition"><MessageSquare /></button>
        )}
      </div>
    );
  }

  // --- FULL DASHBOARD RENDER ---
  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* Toast Notifications */}
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
            
            {/* Header */}
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

            {/* Two-Column Layout */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Left Sidebar */}
              <div className="w-1/3 md:w-80 border-r border-slate-800 bg-slate-900 flex flex-col shrink-0">
                <div className="flex border-b border-slate-800 bg-slate-950 shrink-0">
                  <button 
                    onClick={() => setQueueFilter('active')}
                    className={`flex-1 py-3 text-xs font-medium border-b-2 transition ${queueFilter === 'active' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                  >
                    Waiting & Active
                  </button>
                  <button 
                    onClick={() => setQueueFilter('resolved')}
                    className={`flex-1 py-3 text-xs font-medium border-b-2 transition ${queueFilter === 'resolved' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                  >
                    Resolved
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {displayedSessions.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 mt-10">No {queueFilter} chats.</div>
                  ) : (
                    displayedSessions.map(session => (
                      <button
                        key={session.id}
                        onClick={() => setActiveAdminSessionId(session.id)}
                        className={`w-full text-left p-4 border-b border-slate-800 transition hover:bg-slate-800 ${activeAdminSessionId === session.id ? 'bg-slate-800 border-l-2 border-l-blue-500' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono text-slate-300">#{session.id.substring(5, 11)}</span>
                          {session.status === 'waiting' && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span>}
                          {session.status === 'active' && <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />}
                          {session.status === 'resolved' && <CheckCircle2 className="h-3 w-3 text-slate-500" />}
                        </div>
                        <p className="text-xs text-slate-400 truncate">{session.lastMessage || 'Started chat...'}</p>
                        {session.assignedAgent && (
                          <p className="text-[9px] text-slate-500 mt-2">Handled by: {session.assignedAgent.name}</p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Right Chat Area */}
              <div className="flex-1 bg-slate-950 flex flex-col relative min-w-0">
                {!activeAdminSessionId ? (
                  <div className="m-auto text-center text-slate-500 flex flex-col items-center gap-2">
                    <MessageSquare className="h-10 w-10 opacity-20" />
                    <p className="text-sm">Select a customer session from the queue.</p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
                      <span className="text-xs font-semibold text-slate-200">Chat Session: #{activeAdminSessionId.substring(5, 11)}</span>
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
                            {m.sender === 'user' ? 'Client' : `${m.agentDetails?.name}`}
                          </span>
                          <div className={`p-3 rounded-xl text-sm ${m.sender === 'user' ? 'bg-slate-800 text-slate-200' : 'bg-blue-900/40 text-blue-100 border border-blue-800'}`}>
                            {m.text}
                          </div>
                        </div>
                      ))}
                      <div ref={adminMessagesEndRef} />
                    </div>

                    <form onSubmit={handleAdminSend} className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2 shrink-0">
                      <input 
                        type="text" value={adminReplyText} onChange={(e) => setAdminReplyText(e.target.value)}
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