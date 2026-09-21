/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  MessageSquare,
  Users,
  Search,
  Pin,
  Volume2,
  VolumeX,
  Download,
  Flame,
  AlertTriangle,
  Wrench,
  ShieldAlert,
  Layers,
  Building2,
  Check,
  Smile,
  Hash,
  Activity,
  ArrowDown,
  Trash2,
  Share2,
  Clock,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';
import {
  UserChatMessage,
  ChatChannel,
  OnlineUserPresence,
  UserProfile,
  LineEntry,
  ChatMessageTag,
  ChatTelemetrySnippet
} from '../types';
import { useUserChat } from '../hooks/useUserChat';

interface UserChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: UserProfile;
  lines?: LineEntry[];
  initialChannelId?: string;
  prefillMessage?: string;
  prefillLineRef?: string;
}

const COMMON_EMOJIS = ['👍', '⚠️', '🛠️', '✅', '🔥', '👏', '👀', '💯'];

const TAG_COLORS: Record<ChatMessageTag, { bg: string; text: string; border: string }> = {
  URGENT: { bg: 'bg-rose-500/15', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-500/40' },
  BOTTLENECK: { bg: 'bg-amber-500/15', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-500/40' },
  BREAKDOWN: { bg: 'bg-orange-500/15', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-500/40' },
  QUALITY: { bg: 'bg-purple-500/15', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-500/40' },
  HANDOVER: { bg: 'bg-blue-500/15', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-500/40' },
  BALANCING: { bg: 'bg-teal-500/15', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-500/40' },
  INFO: { bg: 'bg-slate-500/10', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-500/30' }
};

export const UserChatModal: React.FC<UserChatModalProps> = ({
  isOpen,
  onClose,
  profile,
  lines = [],
  initialChannelId = 'floor-general',
  prefillMessage,
  prefillLineRef
}) => {
  const {
    channels,
    activeChannelId,
    activeChannel,
    activeMessages,
    pinnedMessages,
    onlineUsers,
    isConnected,
    activeTyping,
    soundEnabled,
    setSoundEnabled,
    switchChannel,
    sendMessage,
    toggleReaction,
    togglePin,
    deleteMessage,
    sendTyping
  } = useUserChat({ profile, initialChannelId });

  const [inputContent, setInputContent] = useState('');
  const [selectedTag, setSelectedTag] = useState<ChatMessageTag | undefined>();
  const [selectedLineRef, setSelectedLineRef] = useState<string | undefined>(prefillLineRef);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [showPresence, setShowPresence] = useState(false);
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-fill prefilled text if opened with a context
  useEffect(() => {
    if (prefillMessage) {
      setInputContent(prefillMessage);
    }
    if (prefillLineRef) {
      setSelectedLineRef(prefillLineRef);
      // Auto-switch to line channel if exists
      const matchingLineChan = channels.find(c => c.lineNo && prefillLineRef.includes(c.lineNo));
      if (matchingLineChan) {
        switchChannel(matchingLineChan.id);
      }
    }
  }, [prefillMessage, prefillLineRef, channels, switchChannel]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages.length, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, activeChannelId]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!inputContent.trim()) return;

    let telemetrySnippet: ChatTelemetrySnippet | undefined;

    // If a line is selected, embed current production metrics
    if (selectedLineRef) {
      const lineNum = selectedLineRef.replace(/[^0-9]/g, '');
      const foundLine = lines.find(l => l.lineNo === lineNum || l.lineNo === selectedLineRef);
      if (foundLine) {
        telemetrySnippet = {
          lineNo: foundLine.lineNo,
          metricName: `Line ${foundLine.lineNo} Efficiency`,
          value: `${foundLine.efficiency}% (Target: ${foundLine.targetEff}%)`,
          status: foundLine.efficiency >= foundLine.targetEff ? 'ok' : foundLine.efficiency >= foundLine.targetEff - 5 ? 'warning' : 'critical',
          details: `Style: ${foundLine.style} | WIP: ${foundLine.wip} pcs | Output: ${foundLine.achievedProd}/${foundLine.targetProd}`
        };
      }
    }

    sendMessage({
      content: inputContent,
      tag: selectedTag,
      lineRef: selectedLineRef,
      telemetrySnippet
    });

    setInputContent('');
    setSelectedTag(undefined);
    setSelectedLineRef(undefined);
    sendTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputContent(e.target.value);
    sendTyping(e.target.value.length > 0);
  };

  // Quick Action Templates
  const handleApplyTemplate = (type: 'bottleneck' | 'mechanic' | 'quality' | 'timestudy' | 'line_status') => {
    const defaultLine = lines[0] || { lineNo: '18', style: 'Polo Shirt', smv: 18.5, bottleneck: { station: 'Collar Rib Setting', cycleTime: 32 } };
    
    switch (type) {
      case 'bottleneck':
        switchChannel('line-bottlenecks');
        setSelectedTag('BOTTLENECK');
        setSelectedLineRef(`Line ${defaultLine.lineNo}`);
        setInputContent(`🚨 Station ${defaultLine.bottleneck?.station || 'Hemming'} on Line ${defaultLine.lineNo} is running at ${defaultLine.bottleneck?.cycleTime || 32}s (Target CT: 23.5s). Need balancing support or floater operator to clear buffer.`);
        break;
      case 'mechanic':
        switchChannel('mechanic-dispatch');
        setSelectedTag('BREAKDOWN');
        setSelectedLineRef(`Line ${defaultLine.lineNo}`);
        setInputContent(`🛠️ Machine breakdown at Line ${defaultLine.lineNo}: Single Needle Lockstitch needle tensioning unit jammed. Mechanic please attend immediately.`);
        break;
      case 'quality':
        switchChannel('quality-control');
        setSelectedTag('QUALITY');
        setSelectedLineRef(`Line ${defaultLine.lineNo}`);
        setInputContent(`🧵 Quality Defect notice on Line ${defaultLine.lineNo}: Found skipped stitches on collar seam batch. Requesting inline QC audit.`);
        break;
      case 'timestudy':
        switchChannel('ie-balancing');
        setSelectedTag('BALANCING');
        setSelectedLineRef(`Line ${defaultLine.lineNo}`);
        setInputContent(`⏱️ Requesting 5-cycle motion & time study for Line ${defaultLine.lineNo} (${defaultLine.style}) on critical seam workstation.`);
        break;
      case 'line_status':
        setSelectedTag('INFO');
        setSelectedLineRef(`Line ${defaultLine.lineNo}`);
        setInputContent(`📊 Mid-shift telemetry check for Line ${defaultLine.lineNo} (${defaultLine.style}): Output pacing at ${defaultLine.achievedProd} pcs, running at ${defaultLine.efficiency}% efficiency.`);
        break;
    }
    inputRef.current?.focus();
  };

  // Export chat log
  const handleExportChat = () => {
    const channelName = activeChannel?.name || 'chat';
    const linesText = activeMessages.map(m => {
      const tagStr = m.tag ? `[${m.tag}] ` : '';
      const lineStr = m.lineRef ? `(${m.lineRef}) ` : '';
      return `[${m.timestamp}] ${m.senderName} (${m.senderRole}): ${tagStr}${lineStr}${m.content}`;
    }).join('\n\n');

    const headerText = `=== DGU2 IE Daily Control Floor Chat Log ===\nChannel: #${channelName}\nExported At: ${new Date().toLocaleString()}\nTotal Messages: ${activeMessages.length}\n============================================\n\n`;
    
    const blob = new Blob([headerText + linesText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `floor_chat_${channelName}_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter messages by search query
  const displayedMessages = searchQuery.trim()
    ? activeMessages.filter(m =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.lineRef && m.lineRef.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.tag && m.tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : activeMessages;

  // Group channels by category
  const filteredChannels = channels.filter(c =>
    c.name.toLowerCase().includes(channelFilter.toLowerCase()) ||
    c.topic.toLowerCase().includes(channelFilter.toLowerCase())
  );
  const factoryChannels = filteredChannels.filter(c => c.category === 'factory');
  const lineChannels = filteredChannels.filter(c => c.category === 'lines');

  const getChannelIcon = (iconName: string) => {
    switch (iconName) {
      case 'AlertTriangle': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'Wrench': return <Wrench className="w-4 h-4 text-orange-500" />;
      case 'ShieldAlert': return <ShieldAlert className="w-4 h-4 text-purple-500" />;
      case 'Gauge': return <Activity className="w-4 h-4 text-teal-600" />;
      case 'Layers': return <Layers className="w-4 h-4 text-blue-500" />;
      default: return <Hash className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div
      id="user-chat-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="user-chat-modal-window"
        className="relative w-full max-w-6xl h-[92vh] max-h-[860px] bg-[#fbfaf6] border border-[#d9d2c2] rounded-2xl sm:rounded-3xl shadow-2xl flex overflow-hidden cockpit-modal"
        onClick={e => e.stopPropagation()}
      >
        {/* Left Sidebar: Channels & Direct Messages */}
        <aside
          id="chat-channels-sidebar"
          className="w-64 sm:w-72 border-r border-[#d9d2c2] bg-[#f4efe4]/60 flex flex-col shrink-0 overflow-hidden"
        >
          {/* Workspace Title & Live Connection Status */}
          <div className="p-3.5 border-b border-[#d9d2c2] flex items-center justify-between bg-white/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#176f78] text-white flex items-center justify-center font-bold shadow-xs">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#17343a] leading-tight">
                  Shop Floor Chat
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="text-[10px] font-semibold text-[#527078]">
                    {isConnected ? 'Live WebSocket' : 'Connecting...'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowPresence(!showPresence)}
              title="View Online Floor Staff"
              className={`p-1.5 rounded-lg border text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                showPresence
                  ? 'border-[#176f78] bg-[#176f78]/10 text-[#176f78]'
                  : 'border-[#d9d2c2] bg-white text-[#527078] hover:text-[#17343a]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{onlineUsers.length}</span>
            </button>
          </div>

          {/* Search Channels input */}
          <div className="p-2.5 border-b border-[#d9d2c2]/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#527078]" />
              <input
                type="text"
                value={channelFilter}
                onChange={e => setChannelFilter(e.target.value)}
                placeholder="Filter channels..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#d9d2c2] bg-white text-xs text-[#17343a] placeholder:text-[#527078]/70 focus:outline-hidden focus:border-[#176f78]"
              />
            </div>
          </div>

          {/* Channels Scroll Area */}
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {/* Factory Operations Channels */}
            <div>
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#527078] flex items-center justify-between">
                <span>Factory Channels</span>
                <span className="text-[9px] bg-slate-200/80 px-1.5 rounded text-slate-700">{factoryChannels.length}</span>
              </div>
              <div className="space-y-0.5">
                {factoryChannels.map(chan => {
                  const isActive = chan.id === activeChannelId;
                  return (
                    <button
                      key={chan.id}
                      id={`chat-chan-btn-${chan.id}`}
                      onClick={() => switchChannel(chan.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#176f78] text-white font-bold shadow-xs'
                          : 'hover:bg-white/80 text-[#17343a]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {getChannelIcon(chan.iconName)}
                        <span className="truncate">#{chan.name}</span>
                      </div>
                      {chan.unreadCount ? (
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive ? 'bg-white text-[#176f78]' : 'bg-rose-500 text-white'
                        }`}>
                          {chan.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sewing Line Specific Channels */}
            <div>
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#527078] flex items-center justify-between">
                <span>Sewing Line Teams</span>
                <span className="text-[9px] bg-slate-200/80 px-1.5 rounded text-slate-700">{lineChannels.length}</span>
              </div>
              <div className="space-y-0.5">
                {lineChannels.map(chan => {
                  const isActive = chan.id === activeChannelId;
                  return (
                    <button
                      key={chan.id}
                      id={`chat-chan-btn-${chan.id}`}
                      onClick={() => switchChannel(chan.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#176f78] text-white font-bold shadow-xs'
                          : 'hover:bg-white/80 text-[#17343a]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Layers className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-blue-600'}`} />
                        <span className="truncate">#{chan.name}</span>
                      </div>
                      {chan.lineNo && (
                        <span className={`text-[10px] font-mono px-1 rounded ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                        }`}>
                          L{chan.lineNo}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Floor Users Presence Overview */}
            <div className="pt-2 border-t border-[#d9d2c2]/60">
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#527078] flex items-center justify-between">
                <span>On-Floor Staff</span>
                <span className="text-emerald-600 font-bold">{onlineUsers.length} Active</span>
              </div>
              <div className="space-y-1">
                {onlineUsers.slice(0, 5).map(u => (
                  <div
                    key={u.userId}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] text-[#17343a] hover:bg-white/50"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="relative">
                        <div className="w-5 h-5 rounded-full bg-[#176f78]/20 text-[#176f78] font-bold flex items-center justify-center text-[9px]">
                          {u.avatarText}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                          u.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`} />
                      </div>
                      <span className="truncate font-medium">{u.name}</span>
                    </div>
                    {u.activeLine ? (
                      <span className="text-[9px] font-mono px-1 rounded bg-teal-50 text-teal-800 border border-teal-200">
                        {u.activeLine}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400">{u.role}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Current User Card at bottom of sidebar */}
          <div className="p-3 border-t border-[#d9d2c2] bg-white/70 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt={profile.name} className="w-7 h-7 rounded-full object-cover border" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-[#176f78] text-white flex items-center justify-center font-bold text-xs">
                  {profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'IE'}
                </div>
              )}
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-[#17343a] truncate">{profile?.name || 'IE Engineer'}</span>
                <span className="text-[10px] text-[#527078] truncate">{profile?.jobTitle || 'Industrial Engineering'}</span>
              </div>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Chat Chimes' : 'Enable Chat Chimes'}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-[#527078] hover:text-[#17343a] transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
          </div>
        </aside>

        {/* Center: Active Channel Main Chat Stream */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
          {/* Top Bar: Channel Info & Actions */}
          <header className="px-4 py-3 border-b border-[#d9d2c2] flex items-center justify-between bg-[#fbfaf6]/90 shrink-0">
            <div className="flex items-center gap-2.5 truncate">
              <div className="p-2 rounded-xl bg-[#176f78]/10 text-[#176f78]">
                {getChannelIcon(activeChannel.iconName)}
              </div>
              <div className="flex flex-col truncate">
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-bold text-sm uppercase text-[#17343a] tracking-wide">
                    #{activeChannel.name}
                  </h2>
                  {activeChannel.lineNo && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                      Line {activeChannel.lineNo}
                    </span>
                  )}
                  {pinnedMessages.length > 0 && (
                    <button
                      onClick={() => setShowPinned(!showPinned)}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      <Pin className="w-3 h-3 text-amber-600" />
                      <span>{pinnedMessages.length} Pinned</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-[#527078] truncate max-w-lg">
                  {activeChannel.topic}
                </p>
              </div>
            </div>

            {/* Top Bar Action Icons */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                id="chat-toggle-search-btn"
                onClick={() => setShowSearch(!showSearch)}
                title="Search Messages"
                className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  showSearch
                    ? 'border-[#176f78] bg-[#176f78]/10 text-[#176f78]'
                    : 'border-[#d9d2c2] bg-white text-[#527078] hover:text-[#17343a]'
                }`}
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                id="chat-export-btn"
                onClick={handleExportChat}
                title="Export Channel Transcript"
                className="p-2 rounded-xl border border-[#d9d2c2] bg-white text-[#527078] hover:text-[#17343a] transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                id="chat-modal-close-btn"
                onClick={onClose}
                title="Close Chat"
                className="p-2 rounded-xl border border-[#d9d2c2] bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 text-[#527078] transition-all cursor-pointer ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Search Bar when expanded */}
          {showSearch && (
            <div className="px-4 py-2 bg-amber-50/50 border-b border-amber-200 flex items-center gap-2">
              <Search className="w-4 h-4 text-amber-700" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={`Search in #${activeChannel.name}...`}
                className="flex-1 bg-transparent text-xs text-[#17343a] focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] text-amber-800 font-bold px-1.5 py-0.5 rounded hover:bg-amber-200/60"
                >
                  Clear ({displayedMessages.length} results)
                </button>
              )}
            </div>
          )}

          {/* Pinned Messages Banner */}
          {showPinned && pinnedMessages.length > 0 && (
            <div className="bg-amber-500/10 border-b border-amber-500/30 p-3 text-xs space-y-2 max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                <span className="flex items-center gap-1.5">
                  <Pin className="w-3.5 h-3.5 text-amber-600" />
                  Pinned Factory Notices & Directives
                </span>
                <button
                  onClick={() => setShowPinned(false)}
                  className="text-amber-700 hover:underline"
                >
                  Hide
                </button>
              </div>
              {pinnedMessages.map(pm => (
                <div key={pm.id} className="bg-white/80 p-2.5 rounded-xl border border-amber-200 shadow-2xs">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#527078] mb-1">
                    <span className="text-[#17343a]">{pm.senderName} ({pm.senderRole})</span>
                    <span>{pm.timestamp}</span>
                  </div>
                  <p className="text-xs text-[#17343a]">{pm.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Messages Scroll Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#faf8f3]/30">
            {displayedMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#527078]">
                <div className="w-12 h-12 rounded-2xl bg-[#176f78]/10 text-[#176f78] flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-sm text-[#17343a] uppercase">
                  Welcome to #{activeChannel.name}
                </h3>
                <p className="text-xs max-w-sm mt-1">
                  Start the conversation with supervisors, mechanics, QC, and industrial engineers on the sewing floor.
                </p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  <button
                    onClick={() => handleApplyTemplate('bottleneck')}
                    className="px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-50 text-amber-800 text-xs font-bold hover:bg-amber-100 transition-colors"
                  >
                    🚨 Bottleneck Alert
                  </button>
                  <button
                    onClick={() => handleApplyTemplate('mechanic')}
                    className="px-2.5 py-1.5 rounded-lg border border-orange-500/30 bg-orange-50 text-orange-800 text-xs font-bold hover:bg-orange-100 transition-colors"
                  >
                    🛠️ Call Mechanic
                  </button>
                </div>
              </div>
            ) : (
              displayedMessages.map(msg => {
                const isSelf = profile?.name && msg.senderName === profile.name;
                const tagColor = msg.tag ? TAG_COLORS[msg.tag] : null;

                return (
                  <div
                    key={msg.id}
                    id={`chat-msg-${msg.id}`}
                    className={`group relative flex gap-3 p-3 rounded-2xl border transition-all ${
                      msg.isPinned
                        ? 'bg-amber-50/40 border-amber-300'
                        : isSelf
                        ? 'bg-white border-[#d9d2c2] shadow-2xs'
                        : 'bg-white border-[#e7e1d5] shadow-2xs'
                    }`}
                  >
                    {/* User Avatar */}
                    {msg.senderPhoto ? (
                      <img
                        src={msg.senderPhoto}
                        alt={msg.senderName}
                        className="w-8 h-8 rounded-xl object-cover shrink-0 border"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#176f78] to-[#0f4e55] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {msg.senderName.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    {/* Message Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-[#17343a]">
                            {msg.senderName}
                          </span>
                          <span className="text-[10px] font-semibold text-[#527078] px-1.5 py-0.2 rounded bg-slate-100">
                            {msg.senderRole}
                          </span>
                          {msg.lineRef && (
                            <span className="text-[10px] font-mono font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1 rounded">
                              {msg.lineRef}
                            </span>
                          )}
                          {msg.tag && tagColor && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${tagColor.bg} ${tagColor.text} ${tagColor.border}`}>
                              {msg.tag}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-[#527078] shrink-0">
                          {msg.isPinned && (
                            <span title="Pinned message">
                              <Pin className="w-3 h-3 text-amber-600 fill-amber-600" />
                            </span>
                          )}
                          <span>{msg.timestamp}</span>
                        </div>
                      </div>

                      {/* Content Text */}
                      <div className="mt-1 text-xs text-[#17343a] leading-relaxed break-words">
                        {msg.content}
                      </div>

                      {/* Optional Telemetry Snippet Card */}
                      {msg.telemetrySnippet && (
                        <div className={`mt-2 p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                          msg.telemetrySnippet.status === 'critical'
                            ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                            : msg.telemetrySnippet.status === 'warning'
                            ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                            : 'bg-teal-50/70 border-teal-200 text-teal-900'
                        }`}>
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 shrink-0" />
                            <div>
                              <div className="font-bold text-[11px]">{msg.telemetrySnippet.metricName}</div>
                              <div className="text-[10px] opacity-80">{msg.telemetrySnippet.details}</div>
                            </div>
                          </div>
                          <div className="font-mono font-bold text-xs shrink-0">
                            {msg.telemetrySnippet.value}
                          </div>
                        </div>
                      )}

                      {/* Reactions Row */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {msg.reactions.map((reaction, i) => {
                            const hasReacted = profile?.name && reaction.users.includes(profile.name);
                            return (
                              <button
                                key={i}
                                onClick={() => toggleReaction(msg.id, reaction.emoji)}
                                title={reaction.users.join(', ')}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-all cursor-pointer ${
                                  hasReacted
                                    ? 'bg-[#176f78]/15 border-[#176f78] text-[#176f78] font-bold'
                                    : 'bg-white border-[#d9d2c2] text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <span>{reaction.emoji}</span>
                                <span className="font-mono text-[10px]">{reaction.count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Floating Action Menu on Message Hover */}
                    <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-white/95 border border-[#d9d2c2] p-1 rounded-xl shadow-xs">
                      {/* Quick Emojis */}
                      {COMMON_EMOJIS.slice(0, 4).map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(msg.id, emoji)}
                          className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-xs transition-colors cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}

                      {/* Pin Toggle */}
                      <button
                        onClick={() => togglePin(msg.id)}
                        title={msg.isPinned ? 'Unpin message' : 'Pin to channel'}
                        className={`w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-xs transition-colors cursor-pointer ${
                          msg.isPinned ? 'text-amber-600' : 'text-slate-500'
                        }`}
                      >
                        <Pin className="w-3 h-3" />
                      </button>

                      {/* Delete Message */}
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        title="Delete message"
                        className="w-6 h-6 rounded-lg hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center text-xs text-slate-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicator Bar */}
          {activeTyping.length > 0 && (
            <div className="px-4 py-1 bg-[#faf8f3] text-[10px] text-[#527078] italic flex items-center gap-1.5 border-t border-[#e7e1d5]/60 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-ping" />
              <span>{activeTyping.join(', ')} {activeTyping.length === 1 ? 'is' : 'are'} typing on floor...</span>
            </div>
          )}

          {/* Bottom Area: Factory Action Quick Templates & Message Input */}
          <footer className="p-3 border-t border-[#d9d2c2] bg-[#fbfaf6] shrink-0 space-y-2">
            {/* Quick Action Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#527078] shrink-0">
                Quick Dispatch:
              </span>
              <button
                onClick={() => handleApplyTemplate('bottleneck')}
                className="px-2 py-1 rounded-lg border border-amber-500/30 bg-white hover:bg-amber-50 text-amber-800 text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>Bottleneck</span>
              </button>
              <button
                onClick={() => handleApplyTemplate('mechanic')}
                className="px-2 py-1 rounded-lg border border-orange-500/30 bg-white hover:bg-orange-50 text-orange-800 text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Wrench className="w-3 h-3 text-orange-600" />
                <span>Mechanic</span>
              </button>
              <button
                onClick={() => handleApplyTemplate('quality')}
                className="px-2 py-1 rounded-lg border border-purple-500/30 bg-white hover:bg-purple-50 text-purple-800 text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <ShieldAlert className="w-3 h-3 text-purple-600" />
                <span>Quality Defect</span>
              </button>
              <button
                onClick={() => handleApplyTemplate('timestudy')}
                className="px-2 py-1 rounded-lg border border-teal-500/30 bg-white hover:bg-teal-50 text-teal-800 text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Clock className="w-3 h-3 text-teal-600" />
                <span>Time Study</span>
              </button>
              <button
                onClick={() => handleApplyTemplate('line_status')}
                className="px-2 py-1 rounded-lg border border-blue-500/30 bg-white hover:bg-blue-50 text-blue-800 text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Activity className="w-3 h-3 text-blue-600" />
                <span>Share Line Telemetry</span>
              </button>
            </div>

            {/* Input Form & Tag Selectors */}
            <div className="rounded-2xl border border-[#d9d2c2] bg-white p-2 focus-within:border-[#176f78] shadow-2xs transition-colors">
              {/* Optional selected tag / line reference badge bar */}
              {(selectedTag || selectedLineRef) && (
                <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-slate-100 flex-wrap">
                  {selectedTag && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Tag: {selectedTag}
                      <button onClick={() => setSelectedTag(undefined)} className="hover:text-amber-950 font-bold">×</button>
                    </span>
                  )}
                  {selectedLineRef && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                      {selectedLineRef}
                      <button onClick={() => setSelectedLineRef(undefined)} className="hover:text-teal-950 font-bold">×</button>
                    </span>
                  )}
                </div>
              )}

              {/* Textarea */}
              <textarea
                ref={inputRef}
                value={inputContent}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder={`Message #${activeChannel.name}... (Press Enter to send, Shift+Enter for newline)`}
                className="w-full text-xs text-[#17343a] bg-transparent resize-none focus:outline-hidden placeholder:text-[#527078]/70"
              />

              {/* Input Bottom Toolbar */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  {/* Tag Selector Pill */}
                  <select
                    value={selectedTag || ''}
                    onChange={e => setSelectedTag(e.target.value ? (e.target.value as ChatMessageTag) : undefined)}
                    className="text-[10px] font-bold py-1 px-2 rounded-lg border border-[#d9d2c2] bg-[#fbfaf6] text-[#17343a] focus:outline-hidden cursor-pointer"
                  >
                    <option value="">No Tag</option>
                    <option value="URGENT">🚨 URGENT</option>
                    <option value="BOTTLENECK">⚠️ BOTTLENECK</option>
                    <option value="BREAKDOWN">🛠️ BREAKDOWN</option>
                    <option value="QUALITY">🧵 QUALITY</option>
                    <option value="BALANCING">⏱️ BALANCING</option>
                    <option value="HANDOVER">📢 HANDOVER</option>
                    <option value="INFO">ℹ️ INFO</option>
                  </select>

                  {/* Line Selector Pill */}
                  <select
                    value={selectedLineRef || ''}
                    onChange={e => setSelectedLineRef(e.target.value || undefined)}
                    className="text-[10px] font-bold py-1 px-2 rounded-lg border border-[#d9d2c2] bg-[#fbfaf6] text-[#17343a] focus:outline-hidden cursor-pointer"
                  >
                    <option value="">No Line Ref</option>
                    {lines.map(l => (
                      <option key={l.id} value={`Line ${l.lineNo}`}>Line {l.lineNo} ({l.style.slice(0, 14)})</option>
                    ))}
                  </select>
                </div>

                {/* Send Button */}
                <button
                  id="chat-send-message-btn"
                  onClick={handleSend}
                  disabled={!inputContent.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-[#176f78] hover:bg-[#125860] disabled:opacity-40 disabled:hover:bg-[#176f78] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </footer>
        </div>

        {/* Right Drawer: Online Floor Presence Sidebar */}
        {showPresence && (
          <aside
            id="chat-presence-sidebar"
            className="w-64 border-l border-[#d9d2c2] bg-[#fbfaf6] p-4 flex flex-col shrink-0 overflow-y-auto animate-fadeIn"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#d9d2c2]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#176f78]" />
                <h4 className="font-display font-bold text-xs uppercase text-[#17343a]">
                  Floor Presence
                </h4>
              </div>
              <button
                onClick={() => setShowPresence(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#527078]">
                Connected Floor Team ({onlineUsers.length})
              </div>
              {onlineUsers.map(user => (
                <div
                  key={user.userId}
                  className="p-2.5 rounded-xl border border-[#d9d2c2] bg-white shadow-2xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="w-6 h-6 rounded-lg bg-[#176f78] text-white font-bold flex items-center justify-center text-[10px]">
                          {user.avatarText}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                          user.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`} />
                      </div>
                      <span className="text-xs font-bold text-[#17343a] leading-tight">
                        {user.name}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-[#527078] flex items-center justify-between pl-8">
                    <span>{user.jobTitle}</span>
                    <span className="font-mono text-[9px] text-slate-400">{user.lastActive}</span>
                  </div>
                  {user.activeLine && (
                    <div className="pl-8 pt-0.5">
                      <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        Stationed at {user.activeLine}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
