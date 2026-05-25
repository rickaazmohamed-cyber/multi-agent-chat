import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Settings, Code, Send, X, Laptop, Smartphone, User, 
  Copy, Check, Activity, Bell, ShieldAlert, CheckCheck, Clock, Lock, Key
} from 'lucide-react';

// === FIREBASE IMPORTS ===
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  // === STATE MANAGEMENT ===
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [adminReplyText, setAdminReplyText] = useState('');
  
  // Authentication States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  // UI States
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

  // Widget Settings
  const config = {
    title: 'Acme Live Support',
    subtitle: 'We typically reply in minutes',
    primaryColor: '#2563eb', 
    theme: 'light'
  };

  const messagesEndRef = useRef(null);
  const adminMessagesEndRef = useRef(null);

  // === FIREBASE: REAL-TIME LISTENER ===
  useEffect(() => {
    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(fetchedMessages);
      scrollToBottom();
    }, (error) => {
      console.error("Firebase fetch error:", error);
    });

    return () => unsubscribe();
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      adminMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  };

  // === AUTHENTICATION HANDLER ===
  const handleLogin = (e) => {
    e.preventDefault();
    // Hardcoded password for dashboard access
    if (passwordInput === 'admin123') {
      setIsAuthenticated(true);
      setLoginError(false);
      showToast("Access Granted. Welcome back!", "success");
    } else {
      setLoginError(true);
      setPasswordInput('');
      showToast("Invalid security credentials.", "error");
    }
  };

  // === FIREBASE MESSAGING HANDLERS ===
  const handleCustomerSend = async (e) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;

    const messageText = userInput.trim();
    setUserInput(''); 

    try {
      await addDoc(collection(db, 'messages'), {
        text: messageText,
        sender: 'user',
        createdAt: serverTimestamp(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } catch (err) {
      console.error("Error sending message:", err);
      showToast("Failed to send message.", "error");
    }
  };

  const handleAdminSend = async (e) => {
    if (e) e.preventDefault();
    if (!adminReplyText.trim()) return;

    const messageText = adminReplyText.trim();
    setAdminReplyText('');

    try {
      await addDoc(collection(db, 'messages'), {
        text: messageText,
        sender: 'agent',
        agentDetails: activeAgent, 
        createdAt: serverTimestamp(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      showToast("Reply dispatched to user!", "success");
    } catch (err) {
      console.error("Error sending agent reply:", err);
      showToast("Failed to send reply.", "error");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {notifications.map((notif) => (
          <div key={notif.id} className="p-3 rounded-lg shadow-xl border flex items-center gap-3 bg-slate-900 border-slate-700 text-sm animate-in slide-in-from-top-2">
            {notif.type === 'error' && <ShieldAlert className="h-5 w-5 text-rose-400" />}
            {notif.type === 'success' && <CheckCheck className="h-5 w-5 text-emerald-400" />}
            <div>{notif.message}</div>
          </div>
        ))}
      </div>

      {/* ==========================================
          LEFT PANE: ADMIN COMMAND CENTER
         ========================================== */}
      <div className="w-full lg:w-[45%] h-full flex flex-col border-r border-slate-800 bg-slate-900 relative">
        
        {!isAuthenticated ? (
          // --- LOGIN SCREEN ---
          <div className="absolute inset-0 z-10 bg-slate-900 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-2xl p-8 shadow-2xl">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-center text-white mb-1">Agent Restricted Area</h2>
              <p className="text-xs text-center text-slate-400 mb-6">Enter your operator passcode to access the live dashboard.</p>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className="h-4 w-4 text-slate-500" />
                    </div>
                    <input 
                      type="password" 
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Passcode..."
                      className={`w-full pl-10 pr-3 py-2.5 bg-slate-900 border text-sm rounded-lg text-white focus:outline-none focus:ring-1 ${loginError ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500'}`}
                      autoFocus
                    />
                  </div>
                  {loginError && <p className="text-[10px] text-rose-400 mt-1.5 ml-1">Incorrect passcode. Please try again.</p>}
                </div>
                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition text-sm shadow-lg shadow-blue-500/20"
                >
                  Unlock Dashboard
                </button>
              </form>
            </div>
          </div>
        ) : (
          // --- AUTHENTICATED DASHBOARD ---
          <>
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="font-bold text-lg">Support Command Center</h1>
                  <p className="text-xs text-slate-400">Live Firebase Synchronization Active</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAuthenticated(false)}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 border border-slate-700 hover:bg-slate-800 rounded transition flex items-center gap-1"
              >
                <Lock className="h-3 w-3" /> Lock
              </button>
            </div>

            <div className="flex border-b border-slate-800 bg-slate-900">
              <button onClick={() => setActiveTab('agent')} className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 flex items-center justify-center gap-2 ${activeTab === 'agent' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-slate-400'}`}>
                <Activity className="h-4 w-4" /> Live Operator
              </button>
              <button onClick={() => setActiveTab('embed')} className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 flex items-center justify-center gap-2 ${activeTab === 'embed' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-slate-400'}`}>
                <Code className="h-4 w-4" /> Integration
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === 'agent' && (
                <div className="flex flex-col h-full gap-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-slate-200 mb-3">Select Active Representative</h3>
                    <div className="flex gap-2">
                      {agents.map(agent => (
                         <button
                         key={agent.id}
                         onClick={() => setActiveAgentId(agent.id)}
                         className={`flex-1 p-2 rounded border text-xs font-medium transition ${activeAgentId === agent.id ? 'bg-slate-800 border-slate-600' : 'bg-slate-900 border-slate-800 hover:bg-slate-800'}`}
                         style={{ borderBottomColor: activeAgentId === agent.id ? agent.color : '' }}
                       >
                         <div className="w-2 h-2 rounded-full mb-1 mx-auto" style={{ backgroundColor: agent.color }} />
                         {agent.name}
                       </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl flex flex-col overflow-hidden min-h-[350px]">
                    <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-xs font-semibold text-slate-200">Live Client Feed</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {messages.map((m) => (
                        <div key={m.id} className={`flex flex-col max-w-[85%] ${m.sender === 'user' ? 'mr-auto items-start' : 'ml-auto items-end'}`}>
                          <span className="text-[10px] text-slate-500 mb-1 font-medium">
                            {m.sender === 'user' ? 'Client' : `${m.agentDetails?.name || 'Agent'} (${m.agentDetails?.dept || 'Support'})`}
                          </span>
                          <div className={`p-3 rounded-lg text-xs ${m.sender === 'user' ? 'bg-slate-800 text-slate-200' : 'bg-blue-900/40 text-blue-100 border border-blue-800'}`}>
                            {m.text}
                          </div>
                        </div>
                      ))}
                      <div ref={adminMessagesEndRef} />
                    </div>

                    <form onSubmit={handleAdminSend} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
                      <input 
                        type="text" value={adminReplyText} onChange={(e) => setAdminReplyText(e.target.value)}
                        placeholder={`Reply to client as ${activeAgent.name}...`}
                        className="flex-1 text-xs bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                      <button type="submit" className="p-2 bg-blue-600 text-white hover:bg-blue-500 rounded transition"><Send className="h-4 w-4" /></button>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === 'embed' && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 text-sm text-slate-300 leading-relaxed">
                  <h3 className="font-bold text-white mb-2 flex items-center gap-2"><Code className="h-4 w-4" /> Embed Live Chat</h3>
                  <p>Since your chat is now powered by a real database (Firebase), you can safely deploy this React app to Vercel and link directly to it, or compile it into a generic script to inject into standard HTML sites.</p>
                </div>
              )}
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
              <p className="text-slate-500 max-w-md mx-auto">This simulates your live website. Type a message in the widget below, and watch it appear in your command center instantly via Firebase!</p>
            </div>

            <div className="absolute right-6 bottom-6 z-40">
              {isWidgetOpen ? (
                <div className="w-[320px] h-[460px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
                  
                  <div style={{ backgroundColor: config.primaryColor }} className="p-4 text-white flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm">{config.title}</h4>
                      <span className="text-[10px] text-white/80">{config.subtitle}</span>
                    </div>
                    <button onClick={() => setIsWidgetOpen(false)}><X className="h-5 w-5" /></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                    {messages.length === 0 && <p className="text-xs text-center text-slate-400 mt-4">Send a message to start chatting.</p>}
                    
                    {messages.map((m) => (
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
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={handleCustomerSend} className="p-3 border-t bg-white flex gap-2">
                    <input 
                      type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 text-slate-900 text-xs px-3 py-2 rounded border border-slate-200 focus:outline-none focus:border-blue-500"
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