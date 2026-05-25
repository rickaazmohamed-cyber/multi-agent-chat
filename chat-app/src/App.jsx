import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, X, Laptop, Smartphone, 
  Activity, ShieldAlert, CheckCheck, Lock, Inbox, Circle, RotateCcw,
  CheckCircle2, Archive
} from 'lucide-react';

// === FIREBASE IMPORTS ===
import { collection, doc, setDoc, updateDoc, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  const isWidgetMode = new URLSearchParams(window.location.search).get('mode') === 'embed';

  // === AUTH & UI STATES ===
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [queueFilter, setQueueFilter] = useState('active'); 
  const prevWaitingCountRef = useRef(0);

  // === AGENT ROSTER ===
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

  const config = {
    title: 'Acme Live Support',
    subtitle: 'We typically reply in minutes',
    primaryColor: '#2563eb'
  };

  // Sound Notification
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
    if (!sid) {
      sid = 'sess_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('acme_chat_session', sid);
    }
    setCustomerSessionId(sid);
  }, []);

  const handleResetSession = () => {
    localStorage.removeItem('acme_chat_session');
    window.location.reload();
  };

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
      const sessionRef = doc(db, 'sessions', customerSessionId);
      await setDoc(sessionRef, { status: 'waiting', lastMessage: text, updatedAt: Date.now() }, { merge: true });
      await addDoc(collection(db, `sessions/${customerSessionId}/messages`), {
        text, sender: 'user', createdAt: Date.now(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } catch (err) { showToast("Failed to send.", "error"); }
  };

  const handleAdminSend = async (e) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !activeAdminSessionId) return;
    const text = adminReplyText.trim();
    setAdminReplyText('');
    try {
      const sessionRef = doc(db, 'sessions', activeAdminSessionId);
      await updateDoc(sessionRef, { status: 'active', assignedAgent: activeAgent, lastMessage: `Agent: ${text}`, updatedAt: Date.now() });
      await addDoc(collection(db, `sessions/${activeAdminSessionId}/messages`), {
        text, sender: 'agent', agentDetails: activeAgent, createdAt: Date.now(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } catch (err) { showToast("Failed to send.", "error"); }
  };

  const handleResolveSession = async () => {
    if (!activeAdminSessionId) return;
    try {
      await updateDoc(doc(db, 'sessions', activeAdminSessionId), { status: 'resolved', updatedAt: Date.now() });
      setActiveAdminSessionId(null); 
    } catch (err) { showToast("Error.", "error"); }
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
              <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Type..." style={{ color: '#000', backgroundColor: '#fff' }} className="flex-1 text-sm px-4 py-2 rounded-full border border-slate-200" />
              <button type="submit" style={{ backgroundColor: config.primaryColor }} className="h-10 w-10 rounded-full text-white flex items-center justify-center"><Send className="h-4 w-4" /></button>
            </form>
          </div>
        ) : (
          <button onClick={() => setIsWidgetOpen(true)} style={{ backgroundColor: config.primaryColor }} className="w-16 h-16 rounded-full text-white shadow-xl flex items-center justify-center hover:scale-105 transition"><MessageSquare /></button>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-white">
      {/* Admin Panel Logic here remains the same */}
    </div>
  );
}