/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Sparkles, ChevronRight, ChevronLeft, Bot } from 'lucide-react';

interface FloatingChatClusterProps {
  onOpenFloorChat: () => void;
  onOpenAIChat: () => void;
  floorChatUnreadCount?: number;
}

export const FloatingChatCluster: React.FC<FloatingChatClusterProps> = ({
  onOpenFloorChat,
  onOpenAIChat,
  floorChatUnreadCount = 0
}) => {
  // Mobile dock state: automatically start dockable on very small screens, or allow user to toggle
  const [isDocked, setIsDocked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  return (
    <motion.aside
      id="floating-chat-cluster"
      aria-label="Quick Chat & AI Actions"
      initial={{ x: 140, opacity: 0 }}
      animate={{ x: isDocked ? (isMobile ? 'calc(100% - 38px)' : 'calc(100% - 44px)') : 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220, delay: 0.25 }}
      className="fixed z-35 bottom-[76px] sm:bottom-22 right-2.5 sm:right-6 select-none"
    >
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Mobile Dock/Collapse Toggle Button */}
        <button
          id="toggle-dock-cluster-btn"
          type="button"
          onClick={() => setIsDocked(prev => !prev)}
          title={isDocked ? 'Expand Chat Buttons' : 'Collapse Chat Buttons to edge'}
          aria-label={isDocked ? 'Expand chat shortcuts' : 'Minimize chat shortcuts'}
          className="h-8 w-6 sm:h-9 sm:w-7 rounded-l-xl bg-[#17343a]/90 hover:bg-[#17343a] text-teal-200 hover:text-white border-y border-l border-white/20 flex items-center justify-center shadow-lg transition-colors cursor-pointer"
        >
          {isDocked ? (
            <ChevronLeft className="w-3.5 h-3.5 animate-pulse" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 opacity-80 hover:opacity-100" />
          )}
        </button>

        {/* Action Buttons Cluster */}
        <div className="flex items-center gap-2 p-1 rounded-2xl sm:rounded-3xl bg-[#0c2226]/85 backdrop-blur-md border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.25)]">
          {/* 1. Shop Floor Team Chat Trigger */}
          <button
            id="floating-floor-chat-btn"
            type="button"
            onClick={onOpenFloorChat}
            title="Open Real-Time Shop Floor Team Chat (WebSockets)"
            aria-label="Open Real-Time Shop Floor Team Chat"
            className="relative flex items-center gap-2 min-h-[44px] min-w-[44px] px-3 sm:px-3.5 py-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-600 hover:to-teal-700 text-white shadow-md active:scale-95 transition-all cursor-pointer border border-teal-400/30 group"
          >
            <div className="relative shrink-0 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400" />
            </div>

            <div className="hidden sm:flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold leading-tight font-display uppercase tracking-wider">
                  Floor Chat
                </span>
                {floorChatUnreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-bold">
                    {floorChatUnreadCount}
                  </span>
                )}
              </div>
              <span className="text-[9px] text-teal-200 leading-tight">Live Team Stream</span>
            </div>

            {/* Mobile Unread Count Badge */}
            {floorChatUnreadCount > 0 && (
              <span className="sm:hidden absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                {floorChatUnreadCount}
              </span>
            )}
          </button>

          {/* 2. IE AI Advisor (Gemini) Trigger */}
          <button
            id="floating-ie-ai-chat-btn"
            type="button"
            onClick={onOpenAIChat}
            title="Open Industrial Engineering AI Advisor (Gemini)"
            aria-label="Open Industrial Engineering AI Advisor"
            className="relative flex items-center gap-2 min-h-[44px] min-w-[44px] px-3 sm:px-3.5 py-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#176f78] to-[#125860] hover:from-[#1b818c] hover:to-[#176f78] text-white shadow-md active:scale-95 transition-all cursor-pointer border border-teal-300/30 group"
          >
            <div className="relative shrink-0 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse group-hover:rotate-12 transition-transform" />
            </div>

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold leading-tight font-display uppercase tracking-wider">
                IE AI Chat
              </span>
              <span className="text-[9px] text-teal-200 leading-tight">Gemini Assistant</span>
            </div>
          </button>
        </div>
      </div>
    </motion.aside>
  );
};
