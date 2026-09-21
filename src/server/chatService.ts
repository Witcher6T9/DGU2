/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import {
  UserChatMessage,
  ChatChannel,
  OnlineUserPresence,
  ChatMessageTag
} from '../types';

// Default Channels for Garment Factory Industrial Engineering & Shop Floor
export const DEFAULT_CHANNELS: ChatChannel[] = [
  {
    id: 'floor-general',
    name: 'floor-general',
    topic: 'Factory-wide shift handover, hourly target announcements & executive updates',
    category: 'factory',
    iconName: 'Building2',
    unreadCount: 0,
    participantCount: 28
  },
  {
    id: 'line-bottlenecks',
    name: 'line-bottlenecks',
    topic: 'Critical workstation cycle time breaches, starving stations & pacing intervention',
    category: 'factory',
    iconName: 'AlertTriangle',
    unreadCount: 2,
    participantCount: 19
  },
  {
    id: 'mechanic-dispatch',
    name: 'mechanic-dispatch',
    topic: 'Sewing machine breakdowns, folder jig calibration & needle downtime logs (<18 min)',
    category: 'factory',
    iconName: 'Wrench',
    unreadCount: 0,
    participantCount: 14
  },
  {
    id: 'quality-control',
    name: 'quality-control',
    topic: 'In-line seam inspection, SPI compliance, puckering alerts & 100% pass clearances',
    category: 'factory',
    iconName: 'ShieldAlert',
    unreadCount: 1,
    participantCount: 16
  },
  {
    id: 'ie-balancing',
    name: 'ie-balancing',
    topic: 'Standard Minute Value (SMV), Yamazumi pitch charts, floater assignments & Kaizens',
    category: 'factory',
    iconName: 'Gauge',
    unreadCount: 0,
    participantCount: 12
  },
  {
    id: 'line-18',
    name: 'line-18-production',
    topic: 'Line 18 active team channel: Basic Polo Shirt (Buyer: H&M / Target Eff: 65%)',
    category: 'lines',
    iconName: 'Layers',
    lineNo: '18',
    unreadCount: 1,
    participantCount: 8
  },
  {
    id: 'line-04',
    name: 'line-04-production',
    topic: 'Line 04 active team channel: Mens Crew Tee (Buyer: Zara / Target Eff: 68%)',
    category: 'lines',
    iconName: 'Layers',
    lineNo: '04',
    unreadCount: 0,
    participantCount: 7
  },
  {
    id: 'line-01',
    name: 'line-01-production',
    topic: 'Line 01 active team channel: Zip Fleece Jacket (Buyer: Decathlon / Target Eff: 60%)',
    category: 'lines',
    iconName: 'Layers',
    lineNo: '01',
    unreadCount: 0,
    participantCount: 9
  }
];

// Seed initial realistic factory user chat history
const INITIAL_MESSAGES: UserChatMessage[] = [
  {
    id: 'msg-01',
    channelId: 'floor-general',
    senderId: 'usr-hod-01',
    senderName: 'Engr. Masud Alam',
    senderRole: 'HOD / General Manager IE',
    senderEmail: 'masud.alam@garment.com',
    content: 'Good morning engineering team. Today factory target is 48,500 pcs across all 24 running sewing lines. Floor 01 focus is stabilizing Line 18 style changeover to reach 65% by hour 6. All supervisors please ensure Morning Huddles conclude before 08:15.',
    timestamp: '08:05 AM',
    tag: 'HANDOVER',
    isPinned: true,
    reactions: [
      { emoji: '👍', count: 6, users: ['Tariqul Hasan', 'Md. Rafiqul Islam', 'Karim Maintenance'] },
      { emoji: '🎯', count: 4, users: ['Nasrin Akhter', 'Tania Quality'] }
    ]
  },
  {
    id: 'msg-02',
    channelId: 'floor-general',
    senderId: 'usr-sup-01',
    senderName: 'Md. Rafiqul Islam',
    senderRole: 'Line Supervisor',
    senderEmail: 'rafiq.supervisor@garment.com',
    content: 'Line 18 morning top 5 completed. Present MP: 38 operators + 6 helpers. 2 absent operators backfilled with floater pool. Target is 115 pcs/hr.',
    timestamp: '08:18 AM',
    tag: 'INFO',
    lineRef: 'Line 18',
    reactions: [
      { emoji: '✅', count: 3, users: ['Engr. Masud Alam', 'Tariqul Hasan'] }
    ]
  },
  {
    id: 'msg-03',
    channelId: 'line-bottlenecks',
    senderId: 'usr-sup-01',
    senderName: 'Md. Rafiqul Islam',
    senderRole: 'Line Supervisor',
    senderEmail: 'rafiq.supervisor@garment.com',
    content: '🚨 **URGENT BOTTLENECK ALERT on Line 18**: Station 14 (Collar Rib Setting) is pacing at 32.4s against target CT of 23.5s. Work-in-progress buffer has spiked to 84 pieces between station 13 and 14. Operators ahead are starting to starve.',
    timestamp: '09:42 AM',
    tag: 'BOTTLENECK',
    lineRef: 'Line 18',
    telemetrySnippet: {
      lineNo: '18',
      metricName: 'Cycle Time Variance',
      value: '32.4s (Target 23.5s)',
      status: 'critical',
      details: 'Station 14: Collar Rib Setting | WIP: 84 pcs'
    },
    reactions: [
      { emoji: '⚠️', count: 5, users: ['Tariqul Hasan', 'Nasrin Akhter'] }
    ]
  },
  {
    id: 'msg-04',
    channelId: 'line-bottlenecks',
    senderId: 'usr-ie-01',
    senderName: 'Tariqul Hasan',
    senderRole: 'Senior IE Lead',
    senderEmail: 'tariqul.ie@garment.com',
    content: 'Reviewing Line 18 pitch diagram now. Suggest splitting the rib insertion into pre-press folder alignment and seam stitching. Deploying Bottleneck Specialist Nasrin Akhter to Station 14 immediately.',
    timestamp: '09:45 AM',
    tag: 'BALANCING',
    lineRef: 'Line 18',
    reactions: [
      { emoji: '🙌', count: 4, users: ['Md. Rafiqul Islam', 'Engr. Masud Alam'] }
    ]
  },
  {
    id: 'msg-05',
    channelId: 'line-bottlenecks',
    senderId: 'usr-specialist-01',
    senderName: 'Nasrin Akhter',
    senderRole: 'Critical Bottleneck Specialist',
    senderEmail: 'nasrin.specialist@garment.com',
    content: 'Arrived at Line 18 Station 14. Adjusting foot pressure on SNLS machine and demonstrating single-pass rib insertion. Pacing cycle time already reduced to 24.8s on 5 trial garments.',
    timestamp: '09:58 AM',
    tag: 'BALANCING',
    lineRef: 'Line 18',
    reactions: [
      { emoji: '🔥', count: 6, users: ['Md. Rafiqul Islam', 'Tariqul Hasan', 'Engr. Masud Alam'] },
      { emoji: '👏', count: 3, users: ['Tania Quality'] }
    ]
  },
  {
    id: 'msg-06',
    channelId: 'mechanic-dispatch',
    senderId: 'usr-sup-02',
    senderName: 'Abdur Rahim',
    senderRole: 'Line 04 Supervisor',
    senderEmail: 'rahim.line04@garment.com',
    content: '🛠️ **Need Mechanic at Line 04 Station 08**: 4-Thread Overlock upper looper thread snapping repeatedly. Motor belt is also loose. Workstation is idle.',
    timestamp: '10:12 AM',
    tag: 'BREAKDOWN',
    lineRef: 'Line 04',
    telemetrySnippet: {
      lineNo: '04',
      metricName: 'Needle Downtime',
      value: '12 Min Accumulated',
      status: 'warning',
      details: 'Overlock 4-Thread #OL-408 / Looper Tension'
    },
    reactions: [
      { emoji: '🛠️', count: 2, users: ['Karim Mechanic'] }
    ]
  },
  {
    id: 'msg-07',
    channelId: 'mechanic-dispatch',
    senderId: 'usr-mech-01',
    senderName: 'Karimuzzaman',
    senderRole: 'Senior Maintenance Mechanic',
    senderEmail: 'karim.mechanic@garment.com',
    content: 'Dispatched to Line 04 Station 08. Replaced worn looper eyelet and retensioned drive belt. Machine is sewing sample swatch cleanly now with zero skipped stitches. Total downtime: 11 minutes (within 18 min limit).',
    timestamp: '10:24 AM',
    tag: 'INFO',
    lineRef: 'Line 04',
    reactions: [
      { emoji: '✅', count: 4, users: ['Abdur Rahim', 'Tariqul Hasan'] }
    ]
  },
  {
    id: 'msg-08',
    channelId: 'quality-control',
    senderId: 'usr-qc-01',
    senderName: 'Tania Sultana',
    senderRole: 'Quality Assurance Lead',
    senderEmail: 'tania.qa@garment.com',
    content: 'Audited 40 pcs from Line 18 end-of-line table. Seam SPI is 12 (accurate to buyer spec). Notice slight wavy tension on right shoulder seam on batch #4. Line supervisor informed to check bottom thread tension.',
    timestamp: '10:35 AM',
    tag: 'QUALITY',
    lineRef: 'Line 18',
    reactions: [
      { emoji: '👀', count: 3, users: ['Md. Rafiqul Islam', 'Tariqul Hasan'] }
    ]
  },
  {
    id: 'msg-09',
    channelId: 'line-18',
    senderId: 'usr-sup-01',
    senderName: 'Md. Rafiqul Islam',
    senderRole: 'Line Supervisor',
    senderEmail: 'rafiq.supervisor@garment.com',
    content: 'Hour 3 output is 122 pcs! Efficiency climbed to 63.8%. Nasrin is pacing with the cuff hemmer team. Keep bundle flow steady!',
    timestamp: '11:02 AM',
    tag: 'INFO',
    lineRef: 'Line 18',
    isPinned: true,
    reactions: [
      { emoji: '🎉', count: 5, users: ['Nasrin Akhter', 'Tariqul Hasan', 'Masud Alam'] }
    ]
  }
];

// Initial active simulated floor presence roster
const ONLINE_USERS: OnlineUserPresence[] = [
  {
    userId: 'usr-hod-01',
    name: 'Engr. Masud Alam',
    role: 'HOD',
    jobTitle: 'General Manager IE',
    avatarText: 'MA',
    status: 'online',
    lastActive: 'Just now'
  },
  {
    userId: 'usr-ie-01',
    name: 'Tariqul Hasan',
    role: 'IE Lead',
    jobTitle: 'Senior Industrial Engineer',
    avatarText: 'TH',
    status: 'on_floor',
    activeLine: 'Line 18',
    lastActive: '1m ago'
  },
  {
    userId: 'usr-sup-01',
    name: 'Md. Rafiqul Islam',
    role: 'Supervisor',
    jobTitle: 'Sewing Line Supervisor',
    avatarText: 'RI',
    status: 'on_floor',
    activeLine: 'Line 18',
    lastActive: 'Just now'
  },
  {
    userId: 'usr-specialist-01',
    name: 'Nasrin Akhter',
    role: 'Specialist',
    jobTitle: 'Bottleneck Workstation Expert',
    avatarText: 'NA',
    status: 'on_floor',
    activeLine: 'Line 18',
    lastActive: '2m ago'
  },
  {
    userId: 'usr-mech-01',
    name: 'Karimuzzaman',
    role: 'Mechanic',
    jobTitle: 'Senior Maintenance Tech',
    avatarText: 'KM',
    status: 'online',
    lastActive: '4m ago'
  },
  {
    userId: 'usr-qc-01',
    name: 'Tania Sultana',
    role: 'Quality',
    jobTitle: 'Quality Assurance Lead',
    avatarText: 'TS',
    status: 'on_floor',
    activeLine: 'Line 04',
    lastActive: 'Just now'
  }
];

export class ChatService {
  private channels: ChatChannel[] = [...DEFAULT_CHANNELS];
  private messages: UserChatMessage[] = [...INITIAL_MESSAGES];
  private onlineUsers: OnlineUserPresence[] = [...ONLINE_USERS];
  private wss: WebSocketServer | null = null;
  private clientMap = new Map<WebSocket, { userId?: string; name?: string; channelId?: string }>();

  constructor() {
    this.updateChannelUnread();
  }

  private updateChannelUnread() {
    this.channels = this.channels.map(c => {
      const channelMsgs = this.messages.filter(m => m.channelId === c.id);
      return {
        ...c,
        participantCount: c.participantCount || Math.max(5, channelMsgs.length + 3)
      };
    });
  }

  public getChannels(): ChatChannel[] {
    return this.channels;
  }

  public getMessages(channelId: string, limit = 60): UserChatMessage[] {
    return this.messages
      .filter(m => m.channelId === channelId)
      .slice(-limit);
  }

  public getOnlineUsers(): OnlineUserPresence[] {
    return this.onlineUsers;
  }

  public addMessage(msgData: Partial<UserChatMessage>): UserChatMessage {
    const newMessage: UserChatMessage = {
      id: msgData.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      channelId: msgData.channelId || 'floor-general',
      senderId: msgData.senderId || 'anon-user',
      senderName: msgData.senderName || 'Floor Engineer',
      senderRole: msgData.senderRole || 'Industrial Engineer',
      senderPhoto: msgData.senderPhoto,
      senderEmail: msgData.senderEmail,
      content: msgData.content || '',
      timestamp: msgData.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tag: msgData.tag,
      lineRef: msgData.lineRef,
      telemetrySnippet: msgData.telemetrySnippet,
      reactions: msgData.reactions || [],
      isPinned: !!msgData.isPinned,
      isSystem: !!msgData.isSystem
    };

    this.messages.push(newMessage);
    this.broadcast({
      type: 'chat:new_message',
      message: newMessage
    });

    return newMessage;
  }

  public toggleReaction(messageId: string, emoji: string, userName: string): UserChatMessage | null {
    const msg = this.messages.find(m => m.id === messageId);
    if (!msg) return null;

    if (!msg.reactions) {
      msg.reactions = [];
    }

    const existingReaction = msg.reactions.find(r => r.emoji === emoji);
    if (existingReaction) {
      if (existingReaction.users.includes(userName)) {
        // Remove reaction
        existingReaction.users = existingReaction.users.filter(u => u !== userName);
        existingReaction.count = existingReaction.users.length;
        if (existingReaction.count === 0) {
          msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        // Add user to reaction
        existingReaction.users.push(userName);
        existingReaction.count = existingReaction.users.length;
      }
    } else {
      msg.reactions.push({
        emoji,
        count: 1,
        users: [userName]
      });
    }

    this.broadcast({
      type: 'chat:reaction_updated',
      messageId: msg.id,
      channelId: msg.channelId,
      reactions: msg.reactions
    });

    return msg;
  }

  public togglePin(messageId: string): UserChatMessage | null {
    const msg = this.messages.find(m => m.id === messageId);
    if (!msg) return null;

    msg.isPinned = !msg.isPinned;

    this.broadcast({
      type: 'chat:pin_updated',
      messageId: msg.id,
      channelId: msg.channelId,
      isPinned: msg.isPinned
    });

    return msg;
  }

  public deleteMessage(messageId: string, requesterName?: string): boolean {
    const index = this.messages.findIndex(m => m.id === messageId);
    if (index === -1) return false;

    const [deleted] = this.messages.splice(index, 1);
    this.broadcast({
      type: 'chat:message_deleted',
      messageId: deleted.id,
      channelId: deleted.channelId
    });
    return true;
  }

  public setOrUpdateUserPresence(user: Partial<OnlineUserPresence>): void {
    if (!user.name) return;
    const existing = this.onlineUsers.find(u => u.name === user.name || u.userId === user.userId);
    if (existing) {
      existing.status = user.status || existing.status;
      existing.activeLine = user.activeLine || existing.activeLine;
      existing.lastActive = 'Just now';
    } else {
      this.onlineUsers.push({
        userId: user.userId || `usr-${Date.now()}`,
        name: user.name,
        role: user.role || 'IE Staff',
        jobTitle: user.jobTitle || 'Industrial Engineer',
        avatarText: user.avatarText || user.name.slice(0, 2).toUpperCase(),
        status: user.status || 'online',
        activeLine: user.activeLine,
        lastActive: 'Just now'
      });
    }

    this.broadcast({
      type: 'chat:presence_updated',
      onlineUsers: this.onlineUsers
    });
  }

  public broadcast(payload: any, excludeWs?: WebSocket): void {
    if (!this.wss) return;
    const data = JSON.stringify(payload);
    for (const client of this.wss.clients) {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        try {
          client.send(data);
        } catch (e) {
          console.error('WebSocket send error:', e);
        }
      }
    }
  }

  public setupWebSocket(server: http.Server): void {
    this.wss = new WebSocketServer({
      server,
      path: '/ws/chat'
    });

    console.log('[UserChat] WebSocket server initialized on path /ws/chat');

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.clientMap.set(ws, {});

      // Send initial state upon connection
      try {
        ws.send(JSON.stringify({
          type: 'chat:init',
          channels: this.channels,
          onlineUsers: this.onlineUsers,
          recentMessages: this.messages.slice(-100)
        }));
      } catch (err) {
        console.error('Failed to send init to ws client:', err);
      }

      ws.on('message', (rawData) => {
        try {
          const packet = JSON.parse(rawData.toString());
          const action = packet.type;

          if (action === 'chat:join') {
            const meta = this.clientMap.get(ws) || {};
            meta.userId = packet.userId;
            meta.name = packet.name;
            meta.channelId = packet.channelId;
            this.clientMap.set(ws, meta);

            if (packet.name) {
              this.setOrUpdateUserPresence({
                userId: packet.userId,
                name: packet.name,
                role: packet.role,
                jobTitle: packet.jobTitle,
                status: 'online',
                activeLine: packet.activeLine
              });
            }
          } else if (action === 'chat:send') {
            this.addMessage(packet.message);
          } else if (action === 'chat:react') {
            this.toggleReaction(packet.messageId, packet.emoji, packet.userName);
          } else if (action === 'chat:pin') {
            this.togglePin(packet.messageId);
          } else if (action === 'chat:delete') {
            this.deleteMessage(packet.messageId, packet.requesterName);
          } else if (action === 'chat:typing') {
            this.broadcast({
              type: 'chat:typing',
              channelId: packet.channelId,
              userId: packet.userId,
              userName: packet.userName,
              isTyping: !!packet.isTyping
            }, ws);
          } else if (action === 'chat:presence') {
            this.setOrUpdateUserPresence(packet);
          }
        } catch (err) {
          console.error('[UserChat] Error processing websocket message:', err);
        }
      });

      ws.on('close', () => {
        this.clientMap.delete(ws);
      });

      ws.on('error', (err) => {
        console.warn('[UserChat] WebSocket connection error:', err);
      });
    });
  }
}

export const chatService = new ChatService();
