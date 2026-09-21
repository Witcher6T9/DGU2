/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  UserChatMessage,
  ChatChannel,
  OnlineUserPresence,
  UserProfile,
  ChatMessageTag,
  ChatTelemetrySnippet
} from '../types';

export function playChatChime(isCritical = false) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isCritical) {
      // Two-tone attention tone for bottleneck / breakdown
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      // Soft gentle water-drop chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.08); // C6
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (err) {
    // Audio contexts might require user gesture in some browsers
  }
}

interface UseUserChatProps {
  profile?: UserProfile;
  initialChannelId?: string;
}

export function useUserChat({ profile, initialChannelId = 'floor-general' }: UseUserChatProps = {}) {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>(initialChannelId);
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, UserChatMessage[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserPresence[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ie_chat_sound_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  const activeChannelRef = useRef<string>(activeChannelId);

  useEffect(() => {
    activeChannelRef.current = activeChannelId;
  }, [activeChannelId]);

  useEffect(() => {
    try {
      localStorage.setItem('ie_chat_sound_enabled', JSON.stringify(soundEnabled));
    } catch {}
  }, [soundEnabled]);

  // Initial REST fetch to populate data immediately
  const fetchChannelsAndMessages = useCallback(async () => {
    try {
      const [chanRes, usersRes, msgsRes] = await Promise.all([
        fetch('/api/user-chat/channels').then(r => r.json()).catch(() => ({ channels: [] })),
        fetch('/api/user-chat/online-users').then(r => r.json()).catch(() => ({ onlineUsers: [] })),
        fetch(`/api/user-chat/messages?channelId=${encodeURIComponent(activeChannelRef.current)}`).then(r => r.json()).catch(() => ({ messages: [] }))
      ]);

      if (chanRes.channels && chanRes.channels.length > 0) {
        setChannels(chanRes.channels);
      }
      if (usersRes.onlineUsers) {
        setOnlineUsers(usersRes.onlineUsers);
      }
      if (msgsRes.messages) {
        setMessagesByChannel(prev => ({
          ...prev,
          [activeChannelRef.current]: msgsRes.messages
        }));
      }
    } catch (e) {
      console.warn('Initial chat REST sync fallback notice:', e);
    }
  }, []);

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/chat`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Announce user arrival
        const joinPacket = {
          type: 'chat:join',
          userId: profile?.employeeId || profile?.email || 'local-ie-user',
          name: profile?.name || 'IE Engineer',
          role: profile?.role || 'Senior IE',
          jobTitle: profile?.jobTitle || 'Industrial Engineer',
          channelId: activeChannelRef.current
        };
        ws.send(JSON.stringify(joinPacket));
      };

      ws.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          const { type } = packet;

          if (type === 'chat:init') {
            if (packet.channels) setChannels(packet.channels);
            if (packet.onlineUsers) setOnlineUsers(packet.onlineUsers);
            if (packet.recentMessages) {
              // Group initial messages by channel
              const grouped: Record<string, UserChatMessage[]> = {};
              for (const m of packet.recentMessages) {
                if (!grouped[m.channelId]) grouped[m.channelId] = [];
                grouped[m.channelId].push(m);
              }
              setMessagesByChannel(prev => ({ ...prev, ...grouped }));
            }
          } else if (type === 'chat:new_message') {
            const newMsg: UserChatMessage = packet.message;
            setMessagesByChannel(prev => {
              const current = prev[newMsg.channelId] || [];
              if (current.some(m => m.id === newMsg.id)) return prev;
              return {
                ...prev,
                [newMsg.channelId]: [...current, newMsg]
              };
            });

            // Play sound chime if from another user
            const isSelf = profile?.name && newMsg.senderName === profile.name;
            if (!isSelf && soundEnabled) {
              const isUrgent = newMsg.tag === 'URGENT' || newMsg.tag === 'BOTTLENECK' || newMsg.tag === 'BREAKDOWN';
              playChatChime(isUrgent);
            }
          } else if (type === 'chat:reaction_updated') {
            const { messageId, channelId, reactions } = packet;
            setMessagesByChannel(prev => {
              const list = prev[channelId] || [];
              return {
                ...prev,
                [channelId]: list.map(m => m.id === messageId ? { ...m, reactions } : m)
              };
            });
          } else if (type === 'chat:pin_updated') {
            const { messageId, channelId, isPinned } = packet;
            setMessagesByChannel(prev => {
              const list = prev[channelId] || [];
              return {
                ...prev,
                [channelId]: list.map(m => m.id === messageId ? { ...m, isPinned } : m)
              };
            });
          } else if (type === 'chat:message_deleted') {
            const { messageId, channelId } = packet;
            setMessagesByChannel(prev => {
              const list = prev[channelId] || [];
              return {
                ...prev,
                [channelId]: list.filter(m => m.id !== messageId)
              };
            });
          } else if (type === 'chat:presence_updated') {
            if (packet.onlineUsers) {
              setOnlineUsers(packet.onlineUsers);
            }
          } else if (type === 'chat:typing') {
            const { channelId, userName, isTyping } = packet;
            setTypingUsers(prev => {
              const currentList = prev[channelId] || [];
              if (isTyping) {
                if (!currentList.includes(userName)) {
                  return { ...prev, [channelId]: [...currentList, userName] };
                }
              } else {
                return { ...prev, [channelId]: currentList.filter(u => u !== userName) };
              }
              return prev;
            });
          }
        } catch (err) {
          console.error('[useUserChat] Failed to parse message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        // Exponential reconnect attempt
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      ws.onerror = (err) => {
        console.warn('[useUserChat] WebSocket error, fallback to REST:', err);
        ws.close();
      };
    } catch (e) {
      console.error('[useUserChat] Socket init failed:', e);
    }
  }, [profile, soundEnabled]);

  // Connect on mount
  useEffect(() => {
    fetchChannelsAndMessages();
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket, fetchChannelsAndMessages]);

  // If switching channel, make sure messages for that channel are loaded
  const switchChannel = useCallback(async (newChannelId: string) => {
    setActiveChannelId(newChannelId);
    activeChannelRef.current = newChannelId;

    if (!messagesByChannel[newChannelId]) {
      try {
        const res = await fetch(`/api/user-chat/messages?channelId=${encodeURIComponent(newChannelId)}`);
        const data = await res.json();
        if (data.messages) {
          setMessagesByChannel(prev => ({
            ...prev,
            [newChannelId]: data.messages
          }));
        }
      } catch (e) {
        console.warn('Channel fetch error:', e);
      }
    }
  }, [messagesByChannel]);

  // Send message
  const sendMessage = useCallback(async ({
    content,
    tag,
    lineRef,
    telemetrySnippet
  }: {
    content: string;
    tag?: ChatMessageTag;
    lineRef?: string;
    telemetrySnippet?: ChatTelemetrySnippet;
  }) => {
    if (!content.trim() && !telemetrySnippet) return;

    const newMsg: UserChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      channelId: activeChannelId,
      senderId: profile?.employeeId || profile?.email || 'local-user',
      senderName: profile?.name || 'IE Floor Lead',
      senderRole: profile?.jobTitle || profile?.role || 'Industrial Engineer',
      senderPhoto: profile?.photoURL,
      senderEmail: profile?.email,
      content: content.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tag,
      lineRef,
      telemetrySnippet,
      reactions: [],
      isPinned: false
    };

    // Optimistic local update
    setMessagesByChannel(prev => ({
      ...prev,
      [activeChannelId]: [...(prev[activeChannelId] || []), newMsg]
    }));

    // Send via WebSocket if connected, else fallback to REST
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat:send',
        message: newMsg
      }));
    } else {
      try {
        await fetch('/api/user-chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMsg)
        });
      } catch (err) {
        console.error('REST fallback message send error:', err);
      }
    }
  }, [activeChannelId, profile]);

  // Toggle emoji reaction
  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    const userName = profile?.name || 'IE Engineer';

    // Optimistic local update
    setMessagesByChannel(prev => {
      const list = prev[activeChannelId] || [];
      return {
        ...prev,
        [activeChannelId]: list.map(m => {
          if (m.id !== messageId) return m;
          const reactions = m.reactions ? [...m.reactions] : [];
          const existing = reactions.find(r => r.emoji === emoji);
          if (existing) {
            if (existing.users.includes(userName)) {
              existing.users = existing.users.filter(u => u !== userName);
              existing.count = existing.users.length;
            } else {
              existing.users.push(userName);
              existing.count = existing.users.length;
            }
          } else {
            reactions.push({ emoji, count: 1, users: [userName] });
          }
          return {
            ...m,
            reactions: reactions.filter(r => r.count > 0)
          };
        })
      };
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat:react',
        messageId,
        emoji,
        userName
      }));
    } else {
      try {
        await fetch('/api/user-chat/react', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, emoji, userName })
        });
      } catch (err) {
        console.error('REST reaction toggle error:', err);
      }
    }
  }, [activeChannelId, profile]);

  // Toggle pin
  const togglePin = useCallback(async (messageId: string) => {
    // Optimistic local update
    setMessagesByChannel(prev => {
      const list = prev[activeChannelId] || [];
      return {
        ...prev,
        [activeChannelId]: list.map(m => m.id === messageId ? { ...m, isPinned: !m.isPinned } : m)
      };
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat:pin',
        messageId
      }));
    } else {
      try {
        await fetch('/api/user-chat/pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId })
        });
      } catch (err) {
        console.error('REST pin toggle error:', err);
      }
    }
  }, [activeChannelId]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    // Optimistic local update
    setMessagesByChannel(prev => ({
      ...prev,
      [activeChannelId]: (prev[activeChannelId] || []).filter(m => m.id !== messageId)
    }));

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat:delete',
        messageId,
        requesterName: profile?.name
      }));
    } else {
      try {
        await fetch(`/api/user-chat/messages/${encodeURIComponent(messageId)}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.error('REST delete error:', err);
      }
    }
  }, [activeChannelId, profile]);

  // Broadcast typing indicator
  const sendTyping = useCallback((isTyping: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat:typing',
        channelId: activeChannelId,
        userId: profile?.employeeId || profile?.name,
        userName: profile?.name || 'Engineer',
        isTyping
      }));
    }
  }, [activeChannelId, profile]);

  // Active channel's messages
  const activeMessages = messagesByChannel[activeChannelId] || [];

  // Pinned messages in active channel
  const pinnedMessages = activeMessages.filter(m => m.isPinned);

  // Active channel details
  const activeChannel = channels.find(c => c.id === activeChannelId) || {
    id: activeChannelId,
    name: activeChannelId,
    topic: 'Shop Floor Communication',
    category: 'factory',
    iconName: 'Building2'
  };

  // Typing users in current channel
  const activeTyping = (typingUsers[activeChannelId] || []).filter(u => u !== profile?.name);

  // Total unread count approximation
  const totalUnreadCount = channels.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return {
    channels,
    activeChannelId,
    activeChannel,
    activeMessages,
    pinnedMessages,
    onlineUsers,
    isConnected,
    activeTyping,
    soundEnabled,
    totalUnreadCount,
    setSoundEnabled,
    switchChannel,
    sendMessage,
    toggleReaction,
    togglePin,
    deleteMessage,
    sendTyping
  };
}
