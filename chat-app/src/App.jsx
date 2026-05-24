import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Settings, 
  Code, 
  Send, 
  X, 
  ChevronDown, 
  Sparkles, 
  User, 
  Plus,
  Trash2,
  Copy, 
  Check, 
  Laptop, 
  Smartphone, 
  HelpCircle, 
  Clock, 
  CheckCheck,
  ShieldAlert,
  Menu,
  RotateCcw,
  Sliders,
  Bell,
  Users,
  UserCheck
} from 'lucide-react';

export default function App() {
  // Widget Customization Settings
  const [config, setConfig] = useState({
    title: 'Acme Helpdesk',
    subtitle: 'Live Support Online',
    primaryColor: '#6366f1', // Indigo
    welcomeMsg: 'Hello there! 👋 We have agents standing by. Ask us anything!',
    position: 'right', // 'left' or 'right'
    theme: 'light', // 'light' or 'dark'
  });

  // Agent Roster State
  const [agents, setAgents] = useState([
    { id: '1', name: 'Agent Sarah', role: 'Customer Success', color: '#6366f1', status: 'online' },
    { id: '2', name: 'Agent Marcus', role: 'Technical Support', color: '#ef4444', status: 'online' },
    { id: '3', name: 'Agent Chloe', role: 'Billing & Account', color: '#10b981', status: 'online' }
  ]);

  const [activeAgentId, setActiveAgentId] = useState('1');

  // Input state for adding a new agent
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentRole, setNewAgentRole] = useState('General Representative');
  const [newAgentColor, setNewAgentColor] = useState('#8b5cf6');

  // Messaging States
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      sender: 'agent', 
      agentName: 'System', 
      agentRole: 'Automated greeting',
      agentColor: '#64748b',
      text: 'Hello there! 👋 We have agents standing by. Ask us anything!', 
      timestamp: 'Just now' 
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [adminReplyText, setAdminReplyText] = useState('');

  // UI Presentation States
  const [isWidgetOpen, setIsWidgetOpen] = useState(true);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' or 'mobile'
  const [activeTab, setActiveTab] = useState('chat'); // Default to Reply Console for instant preview
  const [copied, setCopied] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Auto-scroll References
  const messagesEndRef = useRef(null);
  const adminMessagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    adminMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Dynamic welcome message synchronization
  useEffect(() => {
    setMessages([
      { 
        id: 1, 
        sender: 'agent', 
        agentName: 'System', 
        agentRole: 'Automated greeting',
        agentColor: '#64748b',
        text: config.welcomeMsg, 
        timestamp: 'Just now' 
      }
    ]);
  }, [config.welcomeMsg]);

  // Toast Alerts system
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  };

  const handleAddAgent = (e) => {
    e.preventDefault();
    if (!newAgentName.trim()) {
      showToast("Please provide a valid agent name", "error");
      return;
    }

    const newAgent = {
      id: Date.now().toString(),
      name: newAgentName.trim(),
      role: newAgentRole,
      color: newAgentColor,
      status: 'online'
    };

    setAgents(prev => [...prev, newAgent]);
    setNewAgentName('');
    showToast(`Added ${newAgent.name} to active roster!`, "success");
  };

  const handleDeleteAgent = (idToDelete) => {
    if (agents.length <= 1) {
      showToast("You must keep at least one active agent in the roster.", "error");
      return;
    }
    
    // If the active answering agent is deleted, shift to another agent
    if (activeAgentId === idToDelete) {
      const remaining = agents.filter(a => a.id !== idToDelete);
      setActiveAgentId(remaining[0].id);
    }

    const targetAgent = agents.find(a => a.id === idToDelete);
    setAgents(prev => prev.filter(a => a.id !== idToDelete));
    showToast(`Removed ${targetAgent?.name || 'Agent'} from support staff.`, "info");
  };

  // Simulate Customer sending a query from the website widget
  const handleCustomerSend = (e) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: userInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setUserInput('');
    
    // Toast notification showing custom routing logic to agents
    const currentResponder = agents.find(a => a.id === activeAgentId) || agents[0];
    showToast(`Client sent a message! Routed to ${currentResponder.name} (${currentResponder.role})`, "bell");
  };

  // Agent sending a reply from the Admin Command Center
  const handleAgentSend = (e) => {
    if (e) e.preventDefault();
    if (!adminReplyText.trim()) return;

    const currentAgent = agents.find(a => a.id === activeAgentId) || agents[0];

    const agentMsg = {
      id: Date.now(),
      sender: 'agent',
      agentId: currentAgent.id,
      agentName: currentAgent.name,
      agentRole: currentAgent.role,
      agentColor: currentAgent.color,
      text: adminReplyText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, agentMsg]);
    setAdminReplyText('');
    showToast(`Reply broadcasted as ${currentAgent.name}!`, "success");
  };

  const handleResetChat = () => {
    setMessages([
      { 
        id: 1, 
        sender: 'agent', 
        agentName: 'System', 
        agentRole: 'Automated greeting',
        agentColor: '#64748b',
        text: config.welcomeMsg, 
        timestamp: 'Just now' 
      }
    ]);
    showToast("Simulation history flushed.", "info");
  };

  const getEmbedCode = () => {
    const formattedRoster = JSON.stringify(agents.map(a => ({ name: a.name, role: a.role, color: a.color })), null, 2);
    return `<!-- ========================================================
     ACME MULTI-AGENT EMBEDDABLE CHAT MODULE
     Paste this script block right before the closing </body> tag.
======================================================== -->
<div id="acme-chat-frame"></div>

<script>
  window.AcmeChatConfig = {
    title: "${config.title}",
    subtitle: "${config.subtitle}",
    primaryColor: "${config.primaryColor}",
    welcomeMsg: "${config.welcomeMsg.replace(/"/g, '\\"')}",
    position: "${config.position}",
    theme: "${config.theme}",
    activeRoster: ${formattedRoster.replace(/\n/g, '\n    ')}
  };

  (function() {
    var d = document;
    var s = d.createElement('script');
    s.src = "https://cdn.acmechat.io/multi-agent-widget.js";
    s.async = true;
    d.getElementsByTagName('head')[0].appendChild(s);
  })();
</script>`;
  };

  const handleCopyCode = () => {
    const el = document.createElement('textarea');
    el.value = getEmbedCode();
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);

    setCopied(true);
    showToast("HTML custom integration code copied!", "success");
    setTimeout(() => setCopied(false), 2500);
  };

  // Find currently selected dispatcher details
  const activeDispatchAgent = agents.find(a => a.id === activeAgentId) || agents[0];

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      
      {/* Toast Overlay Alerts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {notifications.map((notif) => (
          <div 
            key={notif.id} 
            className={`p-3 rounded-lg shadow-2xl border flex items-center gap-3 animate-slide-in text-sm ${
              notif.type === 'error' ? 'bg-rose-950/95 border-rose-500 text-rose-100' :
              notif.type === 'info' ? 'bg-sky-950/95 border-sky-500 text-sky-100' :
              notif.type === 'bell' ? 'bg-amber-950/95 border-amber-500 text-amber-100' :
              'bg-slate-900/95 border-emerald-500 text-emerald-100'
            }`}
          >
            {notif.type === 'error' && <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />}
            {notif.type === 'info' && <Clock className="h-5 w-5 text-sky-400 shrink-0" />}
            {notif.type === 'bell' && <Bell className="h-5 w-5 text-amber-400 shrink-0" />}
            {notif.type === 'success' && <CheckCheck className="h-5 w-5 text-emerald-400 shrink-0" />}
            <div>{notif.message}</div>
          </div>
        ))}
      </div>

      {/* ==========================================
          LEFT PANE: ADMIN & CONSOLE COMMANDER
         ========================================== */}
      <div className="w-full lg:w-[45%] h-full flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900">
        
        {/* Header Title */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight flex items-center gap-2">
                Multi-Agent Dispatch Desk
              </h1>
              <p className="text-xs text-slate-400">Setup separate agents & reply to queries manually</p>
            </div>
          </div>
        </div>

        {/* Console Tab Links */}
        <div className="flex border-b border-slate-800 bg-slate-900 shrink-0">
          <button 
            onClick={() => setActiveTab('customize')}
            className={`flex-1 py-3 px-2 text-xs font-semibold border-b-2 transition duration-150 flex flex-col items-center gap-1 ${
              activeTab === 'customize' 
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>1. Style Widget</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('roster')}
            className={`flex-1 py-3 px-2 text-xs font-semibold border-b-2 transition duration-150 flex flex-col items-center gap-1 relative ${
              activeTab === 'roster' 
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>2. Agent Roster</span>
            <span className="absolute top-1.5 right-4 text-[9px] bg-indigo-600 text-white px-1.5 rounded-full">
              {agents.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-3 px-2 text-xs font-semibold border-b-2 transition duration-150 flex flex-col items-center gap-1 relative ${
              activeTab === 'chat' 
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>3. Reply Console</span>
            {messages.filter(m => m.sender === 'user').length > 0 && (
              <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </button>

          <button 
            onClick={() => setActiveTab('embed')}
            className={`flex-1 py-3 px-2 text-xs font-semibold border-b-2 transition duration-150 flex flex-col items-center gap-1 ${
              activeTab === 'embed' 
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="h-4 w-4" />
            <span>4. Embed Script</span>
          </button>
        </div>

        {/* Tab Scroller Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* TAB 1: BRANDING CUSTOMIZATION */}
          {activeTab === 'customize' && (
            <div className="space-y-6">
              
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-semibold text-indigo-400 flex items-center gap-2">
                  <Sliders className="h-4 w-4" /> Layout & Brand Appearance
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Branding Primary Color</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={config.primaryColor}
                        onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                        className="h-9 w-10 bg-transparent border border-slate-700 rounded cursor-pointer"
                      />
                      <input 
                        type="text" 
                        value={config.primaryColor}
                        onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                        className="w-full text-xs font-mono bg-slate-900 border border-slate-750 rounded px-2 text-slate-300 uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Widget Theme</label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-900 p-0.5 rounded border border-slate-750">
                      <button 
                        onClick={() => setConfig({ ...config, theme: 'light' })}
                        className={`text-xs py-1.5 rounded font-medium ${config.theme === 'light' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        Light
                      </button>
                      <button 
                        onClick={() => setConfig({ ...config, theme: 'dark' })}
                        className={`text-xs py-1.5 rounded font-medium ${config.theme === 'dark' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        Dark
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Header Heading Title</label>
                    <input 
                      type="text" 
                      value={config.title}
                      onChange={(e) => setConfig({ ...config, title: e.target.value })}
                      className="w-full text-sm bg-slate-900 border border-slate-750 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                      placeholder="e.g. Acme Support"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Subtitle status</label>
                    <input 
                      type="text" 
                      value={config.subtitle}
                      onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                      className="w-full text-sm bg-slate-900 border border-slate-750 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                      placeholder="e.g. Typically replies instantly"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Widget Position</label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-900 p-0.5 rounded border border-slate-750">
                      <button 
                        onClick={() => setConfig({ ...config, position: 'left' })}
                        className={`text-xs py-1.5 rounded font-medium ${config.position === 'left' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                      >
                        Left Side
                      </button>
                      <button 
                        onClick={() => setConfig({ ...config, position: 'right' })}
                        className={`text-xs py-1.5 rounded font-medium ${config.position === 'right' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                      >
                        Right Side
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Widget Greeting Message</label>
                  <textarea 
                    value={config.welcomeMsg}
                    onChange={(e) => setConfig({ ...config, welcomeMsg: e.target.value })}
                    className="w-full text-sm bg-slate-900 border border-slate-750 rounded px-3 py-2 text-slate-200 h-16 focus:outline-none focus:border-indigo-500"
                    placeholder="Hello! Welcome to Support."
                  />
                </div>
              </div>

              {/* Reset History */}
              <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400">Clear simulated context:</span>
                <button 
                  onClick={handleResetChat}
                  className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium px-2.5 py-1.5 rounded hover:bg-rose-500/10 transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Flush Simulator Chats
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: AGENT ROSTER */}
          {activeTab === 'roster' && (
            <div className="space-y-6">
              
              {/* Add New Agent Form */}
              <form onSubmit={handleAddAgent} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-semibold text-indigo-400 flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Add a Dedicated Agent
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Agent Full Name</label>
                    <input 
                      type="text" 
                      value={newAgentName}
                      onChange={(e) => setNewAgentName(e.target.value)}
                      placeholder="e.g. Agent Rebecca"
                      className="w-full text-xs bg-slate-900 border border-slate-750 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Signature Color</label>
                    <div className="flex gap-1.5">
                      <input 
                        type="color" 
                        value={newAgentColor}
                        onChange={(e) => setNewAgentColor(e.target.value)}
                        className="h-8 w-10 bg-transparent border border-slate-700 rounded cursor-pointer"
                      />
                      <input 
                        type="text" 
                        value={newAgentColor}
                        onChange={(e) => setNewAgentColor(e.target.value)}
                        className="w-full text-[11px] font-mono bg-slate-900 border border-slate-750 rounded px-2 text-slate-300 uppercase"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Roster Role / Department</label>
                  <select 
                    value={newAgentRole}
                    onChange={(e) => setNewAgentRole(e.target.value)}
                    className="w-full text-xs bg-slate-900 border border-slate-750 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="General Representative">General Support</option>
                    <option value="Technical Support Engineer">Technical Support</option>
                    <option value="Sales Associate">Sales & Billing</option>
                    <option value="Account Specialist">Account Management</option>
                    <option value="Escalation Manager">Escalated Inquiries</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition flex items-center justify-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Agent to Desk
                </button>
              </form>

              {/* Roster list view */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 px-1 uppercase tracking-wider">
                  Active Representatives Roster ({agents.length})
                </h4>

                <div className="space-y-2.5">
                  {agents.map((agent) => (
                    <div 
                      key={agent.id}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {/* Custom Representative Color Badge */}
                        <div 
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0"
                          style={{ backgroundColor: agent.color }}
                        >
                          {agent.name.replace("Agent ", "").substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-200 truncate">{agent.name}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate">{agent.role}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Selector toggle indicator */}
                        <button 
                          onClick={() => {
                            setActiveAgentId(agent.id);
                            showToast(`Active dispatcher changed to: ${agent.name}`, "info");
                          }}
                          className={`text-[10px] px-2.5 py-1.5 rounded font-semibold transition ${
                            activeAgentId === agent.id 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          {activeAgentId === agent.id ? 'Selected' : 'Select'}
                        </button>
                        
                        <button 
                          onClick={() => handleDeleteAgent(agent.id)}
                          className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition"
                          title="Remove Agent"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: REPLY CONSOLE PANEL */}
          {activeTab === 'chat' && (
            <div className="space-y-4 h-full flex flex-col">
              
              {/* Dispatch Active Indicator Card */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div 
                    className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: activeDispatchAgent.color }}
                  >
                    {activeDispatchAgent.name.replace("Agent ", "").substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400">Answering manually as:</span>
                    <p className="text-xs font-bold text-slate-200 truncate">{activeDispatchAgent.name} ({activeDispatchAgent.role})</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setActiveTab('roster')}
                  className="text-[10px] text-indigo-400 hover:underline font-semibold shrink-0"
                >
                  Change Agent
                </button>
              </div>

              {/* Chat Streams Dashboard */}
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl flex flex-col overflow-hidden min-h-[300px]">
                <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-semibold text-slate-200">Live Simulation Feed</span>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                    Client ID: #CLI-291
                  </span>
                </div>

                {/* Messages feed view */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((m) => (
                    <div 
                      key={m.id} 
                      className={`flex flex-col max-w-[85%] ${m.sender === 'user' ? 'mr-auto items-start' : 'ml-auto items-end'}`}
                    >
                      <span className="text-[10px] text-slate-500 mb-0.5 font-medium">
                        {m.sender === 'user' ? 'Customer' : `${m.agentName} (${m.agentRole})`}
                      </span>
                      <div 
                        className={`p-3 rounded-lg text-xs leading-relaxed border ${
                          m.sender === 'user' 
                            ? 'bg-slate-900 border-slate-850 text-slate-200' 
                            : 'bg-indigo-900/10 text-slate-100'
                        }`}
                        style={{ borderColor: m.sender === 'user' ? '#1e293b' : m.agentColor }}
                      >
                        {m.text}
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1">{m.timestamp}</span>
                    </div>
                  ))}
                  <div ref={adminMessagesEndRef} />
                </div>

                {/* Sender Panel */}
                <form onSubmit={handleAgentSend} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
                  <input 
                    type="text"
                    value={adminReplyText}
                    onChange={(e) => setAdminReplyText(e.target.value)}
                    placeholder={`Reply as ${activeDispatchAgent.name}...`}
                    className="flex-1 text-xs bg-slate-950 border border-slate-750 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <button 
                    type="submit"
                    className="p-2 text-slate-900 rounded font-bold transition flex items-center justify-center hover:brightness-110"
                    style={{ backgroundColor: activeDispatchAgent.color }}
                    title="Send Reply"
                  >
                    <Send className="h-3.5 w-3.5 text-white" />
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* TAB 4: EMBED INTEGRATION SCRIPT */}
          {activeTab === 'embed' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <h3 className="text-sm font-semibold text-indigo-400 flex items-center gap-2">
                  <Code className="h-4 w-4" /> Embed Client Widget
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ready to deploy your customized, multi-agent chat system to your production website? Copy this script snippet and insert it before the closing <code className="text-pink-400 font-mono text-[11px]">&lt;/body&gt;</code> tag on your platform templates.
                </p>

                {/* HTML Display area */}
                <div className="relative mt-4">
                  <pre className="p-4 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-96 leading-relaxed select-all">
                    {getEmbedCode()}
                  </pre>
                  <button 
                    onClick={handleCopyCode}
                    className="absolute top-2 right-2 p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-750 transition flex items-center gap-1.5 text-xs font-semibold"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
                <h4 className="font-semibold text-slate-200">
                  🛡️ Multi-Agent Setup Highlights
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-slate-400">
                  <li>Your configurations and roster details are compiled inline automatically.</li>
                  <li>Fully compatible with pure HTML, WordPress, Shopify, Next.js, and static assets.</li>
                  <li>Adjust colors, titles, and rosters without changing the compiled CDN package.</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Footer info console bar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>Active Staff Roster: {agents.length} Online</span>
          <span>Manual Operator Simulator</span>
        </div>

      </div>

      {/* ==========================================
          RIGHT PANE: LIVE INTERACTIVE SITE PREVIEW
         ========================================== */}
      <div className="flex-1 h-full flex flex-col bg-slate-900 overflow-hidden">
        
        {/* Device preview settings */}
        <div className="p-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Preview Layout:</span>
            <div className="flex gap-1 bg-slate-900 rounded border border-slate-800 p-0.5">
              <button 
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1.5 rounded transition ${previewDevice === 'desktop' ? 'bg-slate-750 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                title="Desktop View"
              >
                <Laptop className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1.5 rounded transition ${previewDevice === 'mobile' ? 'bg-slate-750 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                title="Smartphone View"
              >
                <Smartphone className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-900/40 px-3 py-1 rounded font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
            Simulated Site Embed
          </div>
        </div>

        {/* Outer Frame Wrapper */}
        <div className="flex-1 overflow-auto bg-slate-950 p-6 flex items-center justify-center">
          
          {/* Main Website Frame */}
          <div className={`transition-all duration-300 bg-white text-slate-950 shadow-2xl rounded-xl border border-slate-800 flex flex-col overflow-hidden relative ${
            previewDevice === 'desktop' ? 'w-full h-full max-w-5xl max-h-[90%]' : 'w-[360px] h-[640px] max-h-[90%]'
          }`}>
            
            {/* Browser top-bar */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400 block"></span>
                <span className="w-3 h-3 rounded-full bg-amber-400 block"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-400 block"></span>
                <div className="bg-white px-3 py-0.5 rounded text-[11px] text-slate-400 border border-slate-200 ml-4 font-mono select-none">
                  https://www.your-business-website.com
                </div>
              </div>
              <div className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">
                SIMULATED LIVE VIEW
              </div>
            </div>

            {/* Mockup Webpage Body */}
            <div className="flex-1 overflow-y-auto bg-slate-50 relative p-8">
              
              {/* Site Hero Content */}
              <div className="max-w-2xl mx-auto space-y-6 text-center mt-6">
                <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">
                  Customer Support Redefined
                </span>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  Help users with high-fidelity manual dispatch
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
                  Route customer support messages dynamically to different staff experts. Toggle your active dispatch agent on the left, type manual responses, and watch the widget change on-the-fly!
                </p>
                <div className="flex justify-center gap-3">
                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded shadow-lg transition">
                    Start Roster Management
                  </button>
                  <button className="bg-white border border-slate-300 text-slate-700 text-xs font-bold px-5 py-2.5 rounded shadow hover:bg-slate-50 transition">
                    Watch Setup Video
                  </button>
                </div>
              </div>

              {/* Roster Showcase Overview (Static Mockup card) */}
              {previewDevice === 'desktop' && (
                <div className="max-w-3xl mx-auto mt-12 bg-white border border-slate-200 rounded-xl shadow p-4 space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Our Customer Service Team standing by:
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {agents.map(a => (
                      <div key={a.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ backgroundColor: a.color }}
                        >
                          {a.name.replace("Agent ", "").substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{a.name}</p>
                          <span className="text-[9px] text-slate-500 block truncate">{a.role}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FLOATING CUSTOMER SUPPORT CHAT WIDGET */}
              <div className={`fixed absolute z-40 transition-all duration-300 ${
                config.position === 'left' ? 'left-6' : 'right-6'
              } bottom-6`}>
                
                {isWidgetOpen ? (
                  /* THE CHAT BOX INTERFACE */
                  <div className={`w-[320px] md:w-[360px] h-[460px] rounded-2xl shadow-2xl border flex flex-col overflow-hidden transition-all duration-300 select-none ${
                    config.theme === 'dark' 
                      ? 'bg-slate-900 border-slate-850 text-slate-100' 
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}>
                    
                    {/* Brand Header */}
                    <div 
                      style={{ backgroundColor: config.primaryColor }}
                      className="p-4 text-white flex items-center justify-between shrink-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm backdrop-blur">
                          HQ
                        </div>
                        <div>
                          <h4 className="font-bold text-xs leading-none">{config.title}</h4>
                          <span className="text-[10px] text-white/80 mt-1 block flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block animate-ping"></span>
                            {config.subtitle}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsWidgetOpen(false)}
                        className="p-1 rounded-full hover:bg-white/10 transition text-white/95"
                      >
                        <X className="h-4.5 w-4.5" />
                      </button>
                    </div>

                    {/* Chat Messages Log */}
                    <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${
                      config.theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'
                    }`}>
                      {messages.map((m) => (
                        <div 
                          key={m.id} 
                          className={`flex gap-2 max-w-[85%] ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                        >
                          {/* If sender is agent, render their unique agent branding avatar */}
                          {m.sender !== 'user' && (
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[8px] font-bold text-white shadow-sm"
                              style={{ backgroundColor: m.agentColor || config.primaryColor }}
                            >
                              {m.agentName?.substring(0, 2).toUpperCase() || 'SP'}
                            </div>
                          )}

                          <div>
                            {/* Render representative signature indicators for clarification */}
                            {m.sender !== 'user' && (
                              <span className="text-[8px] text-slate-400 block mb-0.5 ml-1">
                                {m.agentName} ({m.agentRole})
                              </span>
                            )}
                            <div 
                              className={`p-3 rounded-2xl text-xs leading-relaxed ${
                                m.sender === 'user' 
                                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                                  : config.theme === 'dark' 
                                    ? 'bg-slate-850 border border-slate-800 text-slate-100 rounded-tl-none' 
                                    : 'bg-white border border-slate-200 text-slate-800 shadow-sm rounded-tl-none'
                              }`}
                              style={{ 
                                backgroundColor: m.sender === 'user' ? config.primaryColor : undefined,
                                borderLeft: m.sender !== 'user' ? `3px solid ${m.agentColor}` : undefined
                              }}
                            >
                              {m.text}
                            </div>
                            <span className="text-[8px] text-slate-400 mt-1 block text-right">{m.timestamp}</span>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Pre-configured testing chips */}
                    <div className={`px-4 py-2 border-t flex gap-1.5 overflow-x-auto shrink-0 ${
                      config.theme === 'dark' ? 'bg-slate-900 border-slate-850' : 'bg-slate-100 border-slate-150'
                    }`}>
                      <button 
                        onClick={() => {
                          setUserInput("I have a billing question, who should I speak to?");
                          showToast("Assigned input. Click send button on the widget!", "info");
                        }}
                        className={`text-[9px] py-1 px-2 rounded-full border whitespace-nowrap transition shrink-0 ${
                          config.theme === 'dark' 
                            ? 'bg-slate-800 border-slate-750 text-slate-300 hover:bg-slate-700' 
                            : 'bg-white border-slate-250 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Billing Question?
                      </button>
                      <button 
                        onClick={() => {
                          setUserInput("My server is throwing a 502 error, help!");
                          showToast("Assigned input. Click send button on the widget!", "info");
                        }}
                        className={`text-[9px] py-1 px-2 rounded-full border whitespace-nowrap transition shrink-0 ${
                          config.theme === 'dark' 
                            ? 'bg-slate-800 border-slate-750 text-slate-300 hover:bg-slate-700' 
                            : 'bg-white border-slate-250 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Technical Issue?
                      </button>
                      <button 
                        onClick={() => {
                          setUserInput("How do I change the active representative replying to me?");
                          showToast("Assigned input. Click send button on the widget!", "info");
                        }}
                        className={`text-[9px] py-1 px-2 rounded-full border whitespace-nowrap transition shrink-0 ${
                          config.theme === 'dark' 
                            ? 'bg-slate-800 border-slate-750 text-slate-300 hover:bg-slate-700' 
                            : 'bg-white border-slate-250 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Change Reps?
                      </button>
                    </div>

                    {/* Submit client query */}
                    <form 
                      onSubmit={handleCustomerSend}
                      className={`p-3 border-t shrink-0 flex gap-2 ${
                        config.theme === 'dark' ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-150'
                      }`}
                    >
                      <input 
                        type="text" 
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Type question as client..."
                        className={`flex-1 text-xs px-3 py-2 rounded focus:outline-none focus:ring-1 ${
                          config.theme === 'dark' 
                            ? 'bg-slate-950 border-slate-750 text-slate-200 focus:ring-indigo-500 focus:border-indigo-500' 
                            : 'bg-slate-50 border-slate-250 text-slate-800 focus:ring-indigo-500 focus:border-indigo-500'
                        }`}
                      />
                      <button 
                        type="submit"
                        style={{ backgroundColor: config.primaryColor }}
                        className="p-2 rounded text-white flex items-center justify-center transition shadow hover:brightness-110 active:scale-95"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </form>

                  </div>
                ) : (
                  /* FLOATING CIRCLE TRIGGER BUTTON */
                  <button 
                    onClick={() => {
                      setIsWidgetOpen(true);
                      showToast("Live customer support widget expanded!", "info");
                    }}
                    style={{ backgroundColor: config.primaryColor }}
                    className="w-14 h-14 rounded-full text-white shadow-2xl flex items-center justify-center cursor-pointer transition transform hover:scale-110 active:scale-95 relative"
                  >
                    <MessageSquare className="h-6 w-6" />
                    <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white"></span>
                  </button>
                )}

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}