

import React, { useState, useEffect, useRef } from 'react';
import { type ChatSession } from '../types.ts';
import { PlusIcon, TrashIcon, CloseIcon, PencilIcon } from './Icons.tsx';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  chats: ChatSession[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSwitchChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onEditChatTitle: (chatId: string, newTitle: string) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  isOpen,
  onClose,
  chats,
  activeChatId,
  onNewChat,
  onSwitchChat,
  onDeleteChat,
  onEditChatTitle
}) => {
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingChatId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingChatId]);

  const handleEditClick = (chat: ChatSession) => {
    setEditingChatId(chat.id);
    setTitleInput(chat.title);
  };
  
  const handleTitleSave = () => {
    if (editingChatId && titleInput.trim()) {
      onEditChatTitle(editingChatId, titleInput.trim());
    }
    setEditingChatId(null);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditingChatId(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-30 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Panel */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-gray-900/90 backdrop-blur-lg border-r border-blue-500/20 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-heading"
      >
        <div className="flex flex-col h-full">
          <header className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 id="history-heading" className="text-lg font-semibold text-cyan-300">
              Chat History
            </h2>
            <button
                onClick={onClose}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                aria-label="Close history panel"
            >
                <CloseIcon className="w-6 h-6" />
            </button>
          </header>

          <div className="p-2">
            <button
              onClick={onNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600/80 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors"
              aria-label="Start new chat"
            >
              <PlusIcon className="w-5 h-5" />
              <span>New Chat</span>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            <ul className="space-y-1">
              {chats.map((chat) => (
                <li key={chat.id}>
                  <div
                    className={`group flex items-center w-full text-left rounded-md transition-colors ${
                      chat.id === activeChatId && !editingChatId
                        ? 'bg-blue-800/50'
                        : 'hover:bg-gray-700/50'
                    }`}
                  >
                    {editingChatId === chat.id ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={titleInput}
                            onChange={(e) => setTitleInput(e.target.value)}
                            onKeyDown={handleTitleKeyDown}
                            onBlur={handleTitleSave}
                            className="flex-1 px-3 py-2 text-sm bg-gray-700 text-white rounded-md border border-cyan-500 focus:outline-none"
                        />
                    ) : (
                        <>
                          <button
                            onClick={() => onSwitchChat(chat.id)}
                            className="flex-1 px-3 py-2 truncate"
                            aria-current={chat.id === activeChatId ? 'page' : undefined}
                          >
                            <span className="text-sm text-gray-200">{chat.title}</span>
                          </button>
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                  onClick={() => handleEditClick(chat)}
                                  className="p-2 text-gray-400 hover:text-cyan-300"
                                  aria-label={`Edit title for ${chat.title}`}
                              >
                                  <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                  onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id) }}
                                  className="p-2 text-gray-400 hover:text-red-400"
                                  aria-label={`Delete chat: ${chat.title}`}
                              >
                                  <TrashIcon className="w-4 h-4" />
                              </button>
                          </div>
                        </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </nav>

          <footer className="p-4 text-center text-xs text-gray-500 border-t border-gray-800">
            Jarvis AI
          </footer>
        </div>
      </aside>
    </>
  );
};

export default HistoryPanel;