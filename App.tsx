

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { type Message, type AIState, type FileData, type ChatSession, type ImageGenerationData, type MessageMode } from './types';
import { useSpeech } from './hooks/useSpeech';
import ChatInterface from './components/ChatInterface';
import HolographicFace from './components/HolographicFace';
import InputBar from './components/InputBar';
import HistoryPanel from './components/HistoryPanel';
import { generateResponseStream, generateEmailDraft, generateImage, generateDetailedImagePrompt } from './services/aiService';
import { type GenerateContentResponse } from '@google/genai';
import { HistoryIcon, ImageIcon, SearchWebIcon, PaperClipIcon } from './components/Icons';

const App: React.FC = () => {
  const [allChats, setAllChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [aiState, setAiState] = useState<AIState>('idle');
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<FileData[]>([]);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  
  const [isImageMode, setIsImageMode] = useState(false);
  const [isDeepResearchMode, setIsDeepResearchMode] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);


  const activeChat = useMemo(() => {
    return allChats.find(chat => chat.id === activeChatId) || null;
  }, [allChats, activeChatId]);

  const messages = useMemo(() => activeChat?.messages || [], [activeChat]);

  // Load chats from localStorage on initial render
  useEffect(() => {
    let loadedChats: ChatSession[] = [];
    try {
      const savedChats = localStorage.getItem('jarvis-all-chats');
      if (savedChats) {
        loadedChats = JSON.parse(savedChats);
      }
    } catch (error) {
      console.error("Could not load chats from localStorage", error);
    }

    if (loadedChats.length === 0) {
      // Create a new chat if storage is empty
      const newChatId = Date.now().toString();
      const initialChat: ChatSession = {
        id: newChatId,
        title: 'New Chat',
        createdAt: Date.now(),
        messages: [{
          id: 'init',
          role: 'assistant',
          text: "Hello, I am Jarvis. I'm ready to assist you. You can type a message or activate my voice commands by saying 'Hey Jarvis'.",
          isStreaming: false,
        }],
      };
      setAllChats([initialChat]);
      setActiveChatId(newChatId);
    } else {
      setAllChats(loadedChats);
      const lastActiveId = localStorage.getItem('jarvis-active-chat-id');
      const isValidId = loadedChats.some(c => c.id === lastActiveId);
      setActiveChatId(isValidId ? lastActiveId : loadedChats[0]?.id || null);
    }
  }, []);

  // Save chats to localStorage whenever they change
  useEffect(() => {
    if (allChats.length > 0) {
      localStorage.setItem('jarvis-all-chats', JSON.stringify(allChats));
    } else {
      localStorage.removeItem('jarvis-all-chats');
    }
    if (activeChatId) {
      localStorage.setItem('jarvis-active-chat-id', activeChatId);
    }
  }, [allChats, activeChatId]);
  
  const findMessage = (messageId: string): [ChatSession | undefined, Message | undefined] => {
      for (const chat of allChats) {
          const message = chat.messages.find(m => m.id === messageId);
          if (message) {
              return [chat, message];
          }
      }
      return [undefined, undefined];
  };

  const updateMessage = (messageId: string, updater: (msg: Message) => Message) => {
      setAllChats(prev => prev.map(chat => ({
          ...chat,
          messages: chat.messages.map(msg => msg.id === messageId ? updater(msg) : msg)
      })));
  };

  const downloadNote = (content: string, filename: string = 'Note from Jarvis.txt') => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleUserInputRef = useRef<((text: string, filesData: FileData[]) => Promise<void>) | null>(null);

  const onListenCallback = useCallback((finalTranscript: string) => {
    if (handleUserInputRef.current) {
        handleUserInputRef.current(finalTranscript, uploadedFiles);
    }
  }, [uploadedFiles]);
  
  const handleSpeechError = useCallback((error: string) => {
    if (error === 'not-allowed') {
      setIsMicEnabled(false);
      setCurrentError("Microphone access was denied. Please allow microphone access and turn the mic back on.");
    } else {
        console.warn(`Unhandled speech recognition error: ${error}`);
    }
  }, []);

  const { isListening, isSpeaking, speak, stopSpeaking, speakingMessageId, isAwake, startListening, stopListening } = useSpeech({
    onListen: onListenCallback,
    onStateChange: (newState) => {
        if (newState === 'listening' || newState === 'speaking') {
            setAiState(newState);
        } else if (newState === 'idle' && aiState !== 'thinking') {
            setAiState('idle');
        }
    },
    onError: handleSpeechError,
  });
  
  useEffect(() => {
    const shouldBeListening = isMicEnabled && aiState !== 'thinking' && !isSpeaking;
    if (shouldBeListening && !isListening) startListening();
    else if (!shouldBeListening && isListening) stopListening();
  }, [isMicEnabled, aiState, isSpeaking, isListening, startListening, stopListening]);

  const updateActiveChatMessages = (updater: (prevMessages: Message[]) => Message[]) => {
    setAllChats(prevChats =>
      prevChats.map(chat =>
        chat.id === activeChatId
          ? { ...chat, messages: updater(chat.messages) }
          : chat
      )
    );
  };
  
  const handleImagePromptConfirmation = useCallback(async (messageId: string, confirmed: boolean) => {
    const [, message] = findMessage(messageId);
    if (!message || !message.imageGenData || message.imageGenData.status !== 'confirming_prompt') return;

    if (!confirmed) {
      const { originalPrompt } = message.imageGenData;
      updateMessage(messageId, msg => ({
        ...msg,
        text: `Image generation for "${originalPrompt}" was cancelled.`,
        imageGenData: undefined,
      }));
      return;
    }

    const { prompt } = message.imageGenData;
    updateMessage(messageId, msg => ({
      ...msg,
      text: `Generating an image for: "${prompt}"`,
      imageGenData: { ...msg.imageGenData!, status: 'generating' }
    }));
    setAiState('thinking');

    try {
      const imageBase64 = await generateImage(prompt);
      const imageUrl = `data:image/jpeg;base64,${imageBase64}`;
      updateMessage(messageId, msg => {
        const newImages = [...(msg.imageGenData?.images || []), { url: imageUrl, prompt }];
        return {
          ...msg,
          text: `Generated an image based on the prompt: "${prompt}"`,
          imageGenData: { ...msg.imageGenData!, status: 'done', images: newImages }
        };
      });
    } catch (error) {
      const errorText = error instanceof Error ? error.message : "An unknown error occurred.";
      updateMessage(messageId, msg => ({
        ...msg,
        imageGenData: { ...msg.imageGenData!, status: 'error', error: errorText }
      }));
    } finally {
      setAiState('idle');
    }
  }, [findMessage, updateMessage]);

  const handleImageAction = useCallback(async (messageId: string, action: 'regenerate' | 'cancel') => {
        const [, message] = findMessage(messageId);
        if (!message || !message.imageGenData) return;

        if (action === 'cancel') {
            updateMessage(messageId, msg => ({
                ...msg,
                text: "Image generation cancelled.",
                imageGenData: undefined,
            }));
            return;
        }

        // Action must be 'regenerate'
        const { prompt } = message.imageGenData;

        updateMessage(messageId, msg => ({
            ...msg,
            text: `Regenerating an image for: "${prompt}"`,
            imageGenData: { ...msg.imageGenData!, status: 'generating' }
        }));

        try {
            const imageBase64 = await generateImage(prompt);
            const imageUrl = `data:image/jpeg;base64,${imageBase64}`;
            
            updateMessage(messageId, msg => {
                const newImages = [...(msg.imageGenData?.images || []), { url: imageUrl, prompt }];
                return {
                    ...msg,
                    text: `Generated an image based on the prompt: "${prompt}"`,
                    imageGenData: { ...msg.imageGenData!, status: 'done', images: newImages }
                };
            });

        } catch (error) {
            const errorText = error instanceof Error ? error.message : "An unknown error occurred.";
            updateMessage(messageId, msg => ({
                ...msg,
                imageGenData: { ...msg.imageGenData!, status: 'error', error: errorText }
            }));
        }
    }, [findMessage, updateMessage]);

    const startImageGeneration = useCallback(async (prompt: string, mode?: MessageMode) => {
        setAiState('thinking');
        const assistantMessageId = (Date.now() + 1).toString();
        const initialImageGenData: ImageGenerationData = {
            status: 'confirming_prompt',
            originalPrompt: prompt,
            prompt: '', // To be filled by the detailed prompt
            images: [],
        };
        
        updateActiveChatMessages(prev => [ ...prev, { 
            id: assistantMessageId, 
            role: 'assistant', 
            text: `Enhancing prompt for: "${prompt}"...`,
            isStreaming: false,
            imageGenData: initialImageGenData,
            mode,
        }]);

        try {
            const detailedPrompt = await generateDetailedImagePrompt(prompt);
            updateMessage(assistantMessageId, msg => ({
                ...msg,
                text: "Here is a suggested prompt. Shall I proceed?",
                imageGenData: { ...msg.imageGenData!, prompt: detailedPrompt },
            }));

        } catch (error) {
            const errorText = error instanceof Error ? error.message : "An unknown error occurred during prompt enhancement.";
            updateMessage(assistantMessageId, msg => ({
                ...msg,
                text: errorText,
                imageGenData: { ...msg.imageGenData!, status: 'error', error: errorText }
            }));
        } finally {
            setAiState('idle');
        }
    }, [updateActiveChatMessages, updateMessage]);

  const handleUserInput = useCallback(async (text: string, filesData: FileData[]) => {
    if (!text.trim() && filesData.length === 0) return;
    if (!activeChatId) return;

    const currentMode = isImageMode ? 'image_gen' : isDeepResearchMode ? 'deep_research_gen' : undefined;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      fileInfos: filesData.length > 0 ? filesData.map(f => ({ name: f.name, type: f.type })) : undefined,
      mode: currentMode,
    };

    const isNewChat = activeChat?.messages.length === 1 && activeChat.messages[0].id === 'init';
    const mainContent = text || filesData[0]?.name || 'New Chat';
    const newTitle = isNewChat ? (mainContent.substring(0, 40) + (mainContent.length > 40 ? '...' : '')) : activeChat?.title;
    
    setAllChats(prev => prev.map(c => {
        if (c.id === activeChatId) {
            const existingMessages = c.messages.filter(m => m.id !== 'file-upload-system-message');
            return {...c, title: newTitle, messages: [...existingMessages, userMessage]};
        }
        return c;
    }));
    setUploadedFiles([]); // Clear uploaded files after associating them with a message
    
    const createAssistantMessage = (text: string) => ({ id: Date.now().toString(), role: 'assistant' as const, text, isStreaming: false });
    
    // --- RESTORED LOGIC ---

    // 1. Handle explicit modes first
    if (isImageMode) {
        if (text.trim()) {
            await startImageGeneration(text.trim(), 'image_gen');
        }
        setIsImageMode(false); // Turn off image mode after use
        return;
    }

    if (isDeepResearchMode) {
        // Fall through to default handler below
    } else {
        // 2. Handle file uploads (they default to chat, so they fall through)
        if (filesData.length > 0) {
            // Fall through
        } 
        // 3. Handle text-only input: command matching (no intent detection for speed)
        else if (text.trim()) {
            setAiState('thinking');
            setCurrentError(null);

            // Regex-based commands
            const emailIntentRegex = /\b(email|send an email to)\b/i;
            const youtubeSearchRegex = /^(?:search for|find|play)\s+(.+)\s+on youtube/i;
            const noteRegex = /(create|make|take|write)\s+(a\s+)?note\s*(?:about|that|saying)?:?\s*(.*)/i;
            const openWebsiteRegex = /^(?:open|go to|launch)\s+(.+)/i;
            
            if (emailIntentRegex.test(text)) {
                setAiState('thinking');
                try {
                    const draft = await generateEmailDraft(text);
                    if (!draft.recipient) {
                        updateActiveChatMessages(prev => [...prev, createAssistantMessage("I couldn't determine a recipient. Please try again and include a full email address.")]);
                    } else {
                        const mailtoLink = `mailto:${draft.recipient}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
                        window.open(mailtoLink, '_blank');
                        updateActiveChatMessages(prev => [...prev, createAssistantMessage(`I've prepared an email draft to ${draft.recipient} for you.`)]);
                    }
                } catch (error) {
                    const errorText = error instanceof Error ? error.message : 'I had trouble drafting that email.';
                    updateActiveChatMessages(prev => [...prev, createAssistantMessage(errorText)]);
                } finally {
                    setAiState('idle');
                }
                return;
            }

            const youtubeSearchMatch = text.match(youtubeSearchRegex);
            if (youtubeSearchMatch) {
                const query = encodeURIComponent(youtubeSearchMatch[1]);
                window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
                updateActiveChatMessages(prev => [...prev, createAssistantMessage(`Searching for "${youtubeSearchMatch[1]}" on YouTube.`)]);
                setAiState('idle');
                return;
            }

            const openWebsiteMatch = text.match(openWebsiteRegex);
            if (openWebsiteMatch) {
                let siteName = openWebsiteMatch[1].trim();
                let url = (!siteName.includes('.') && !siteName.toLowerCase().includes('localhost')) ? `https://${siteName.replace(/\s+/g, '')}.com` : siteName.startsWith('http') ? siteName : 'https://' + siteName;
                window.open(url, '_blank', 'noopener,noreferrer');
                updateActiveChatMessages(prev => [...prev, createAssistantMessage(`Opening ${siteName} for you.`)]);
                setAiState('idle');
                return;
            }

            const noteMatch = text.match(noteRegex);
            if (noteMatch) {
                const noteContent = noteMatch[3];
                if (noteContent) {
                    downloadNote(noteContent);
                    updateActiveChatMessages(prev => [...prev, createAssistantMessage(`I've created a note with your content. It should be in your downloads.`)]);
                } else {
                    updateActiveChatMessages(prev => [...prev, createAssistantMessage(`Of course. What should I write in the note?`)]);
                }
                setAiState('idle');
                return;
            }
        }
    }
    
    // 4. Default to general chat response (also handles Deep Research)
    setAiState('thinking');
    setCurrentError(null);
    
    const assistantMessageId = (Date.now() + 1).toString();
    updateActiveChatMessages(prev => [ ...prev, { id: assistantMessageId, role: 'assistant', text: '...', isStreaming: true, mode: currentMode }]);
    
    try {
      const stream = await generateResponseStream(allChats, activeChatId, text, filesData, { deepResearch: isDeepResearchMode });
      
      let fullText = '';
      let finalResponse: GenerateContentResponse | null = null;
      for await (const chunk of stream) {
        fullText += chunk.text;
        finalResponse = chunk;
        updateMessage(assistantMessageId, m => ({ ...m, text: fullText }));
      }
      
      const metadata = finalResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks;
      updateMessage(assistantMessageId, m => ({ ...m, isStreaming: false, groundingMetadata: metadata }));
      
    } catch (error) {
        console.error("AI Service Error:", error);
        let errorMessageText = 'My apologies, I am unable to connect to my core systems. Please try again later.';
        
        if (error instanceof Error) {
            if (error.message.includes('API_KEY is missing')) {
                errorMessageText = 'AI Service Error: The API Key is missing. Please add it to your Vercel Environment Variables (Name: API_KEY) and redeploy the project.';
            } else if (error.message.toLowerCase().includes('api key not valid')) {
                errorMessageText = 'AI Service Error: The provided API Key is invalid. Please check the key in your Vercel Environment Variables.';
            } else {
                errorMessageText = `An unexpected error occurred: ${error.message}`;
            }
        }
        
        updateMessage(assistantMessageId, m => ({ ...m, text: errorMessageText, isStreaming: false }));
        setCurrentError(errorMessageText);
    } finally {
        setAiState('idle');
        setIsDeepResearchMode(false);
    }
  }, [allChats, activeChatId, activeChat, isImageMode, startImageGeneration, isDeepResearchMode, updateActiveChatMessages, updateMessage]);

  useEffect(() => {
    handleUserInputRef.current = handleUserInput;
  }, [handleUserInput]);
  
  const handleMicToggle = () => setIsMicEnabled(prev => !prev);
  
  const handleActionToggle = () => {
    if (uploadedFiles.length > 0) return;
    setIsActionMenuOpen(prev => !prev);
  };
  
  const handleSelectImageMode = () => {
      setIsImageMode(true);
      setIsDeepResearchMode(false);
      setIsActionMenuOpen(false);
  };

  const handleSelectDeepResearchMode = () => {
      setIsDeepResearchMode(true);
      setIsImageMode(false);
      setIsActionMenuOpen(false);
  };

  const handleUploadFileClick = () => {
    fileInputRef.current?.click();
    setIsActionMenuOpen(false);
  };

  const handleCancelMode = () => {
    setIsImageMode(false);
    setIsDeepResearchMode(false);
  };

  const handleNewChat = useCallback(() => {
    stopSpeaking();
    const newChatId = Date.now().toString();
    const newChat: ChatSession = {
      id: newChatId,
      title: 'New Chat',
      createdAt: Date.now(),
      messages: [{
        id: 'init',
        role: 'assistant',
        text: "Hello, I am Jarvis. I'm ready to assist you. You can type a message or activate my voice commands by saying 'Hey Jarvis'.",
        isStreaming: false,
      }],
    };
    setAllChats(prev => [newChat, ...prev]);
    setActiveChatId(newChatId);
    setAiState('idle');
    setCurrentError(null);
    setUploadedFiles([]);
    setIsHistoryOpen(false);
    setIsImageMode(false);
    setIsDeepResearchMode(false);
    setIsActionMenuOpen(false);
  }, [stopSpeaking]);

  const handleSwitchChat = (chatId: string) => {
    if (chatId === activeChatId) return;
    stopSpeaking();
    setActiveChatId(chatId);
    setAiState('idle');
    setIsHistoryOpen(false);
    setIsImageMode(false);
    setIsDeepResearchMode(false);
    setIsActionMenuOpen(false);
  };
  
  const handleDeleteChat = (chatIdToDelete: string) => {
      if (!window.confirm("Are you sure you want to delete this chat? This action cannot be undone.")) {
          return;
      }

      setAllChats(prevChats => {
          const remainingChats = prevChats.filter(c => c.id !== chatIdToDelete);
          
          if (activeChatId === chatIdToDelete) {
              if (remainingChats.length > 0) {
                  setActiveChatId(remainingChats[0].id);
              } else {
                  handleNewChat();
                  return []; // handleNewChat will set the new state
              }
          }
          
          return remainingChats;
      });
  };

  const handleEditChatTitle = (chatId: string, newTitle: string) => {
    setAllChats(prev => prev.map(c => c.id === chatId ? { ...c, title: newTitle } : c));
  };
  
  const handleEditMessage = async (messageId: string, newText: string) => {
    if (!activeChatId || !newText.trim()) return;

    let targetChatIndex = -1;
    let targetMessageIndex = -1;

    allChats.forEach((chat, cIndex) => {
      const mIndex = chat.messages.findIndex(m => m.id === messageId);
      if (mIndex !== -1) {
        targetChatIndex = cIndex;
        targetMessageIndex = mIndex;
      }
    });

    if (targetChatIndex === -1 || targetMessageIndex === -1) {
      console.error("Message to edit not found");
      return;
    }
    
    stopSpeaking();
    setAiState('idle');
    setIsImageMode(false);
    setIsDeepResearchMode(false);

    const truncatedMessages = allChats[targetChatIndex].messages.slice(0, targetMessageIndex);
    const editedMessage = allChats[targetChatIndex].messages[targetMessageIndex];

    const originalFiles = editedMessage.fileInfos ? uploadedFiles.filter(f => editedMessage.fileInfos?.some(fi => fi.name === f.name)) : [];

    setAllChats(prevChats => {
      const newChats = [...prevChats];
      newChats[targetChatIndex] = {
        ...newChats[targetChatIndex],
        messages: truncatedMessages,
      };
      return newChats;
    });

    setTimeout(() => {
        if(handleUserInputRef.current) {
            handleUserInputRef.current(newText, originalFiles);
        }
    }, 0);
  };


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const filePromises = Array.from(files).map(file => {
        return new Promise<FileData>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = (e.target?.result as string)?.split(',')[1];
            if (base64) {
              resolve({ name: file.name, type: file.type, data: base64 });
            } else {
              reject(new Error("Failed to read file"));
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      Promise.all(filePromises).then(newFiles => {
        setUploadedFiles(prev => [...prev, ...newFiles]);
      }).catch(err => {
        console.error("Error reading files:", err);
        setCurrentError("Sorry, there was an error processing one of your files.");
      });

      event.target.value = '';
    }
  };
  
  const handleRemoveFile = (fileNameToRemove: string) => {
    setUploadedFiles(prev => prev.filter(file => file.name !== fileNameToRemove));
  };

  return (
    <div className="bg-black text-gray-200 font-sans w-full h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        chats={allChats}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSwitchChat={handleSwitchChat}
        onDeleteChat={handleDeleteChat}
        onEditChatTitle={handleEditChatTitle}
      />
      <div className="relative w-full h-full max-w-4xl mx-auto flex flex-col bg-gray-900/50 backdrop-blur-md rounded-2xl border border-blue-500/20 shadow-2xl shadow-blue-500/10">
        <div className="absolute top-4 left-4 z-20">
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-cyan-300 hover:border-cyan-400/50 transition-all duration-200"
              aria-label="Open chat history"
            >
              <HistoryIcon className="w-5 h-5" />
            </button>
        </div>
        <HolographicFace state={aiState} isAwake={isAwake} />
        {currentError && (
          <div className="text-center text-red-400 p-2 bg-red-900/20 border-y border-red-500/30 flex items-center justify-center">
            <span>{currentError}</span>
          </div>
        )}
        <ChatInterface
          messages={messages}
          speak={speak}
          stopSpeaking={stopSpeaking}
          speakingMessageId={speakingMessageId}
          onEditMessage={handleEditMessage}
          onImageRegenerate={(id) => handleImageAction(id, 'regenerate')}
          onImageCancel={(id) => handleImageAction(id, 'cancel')}
          onImageConfirm={handleImagePromptConfirmation}
        />
        <div className="relative">
          {isActionMenuOpen && (
            <div className="absolute bottom-full left-4 mb-2 flex flex-col gap-2 w-48">
              <button
                onClick={handleSelectImageMode}
                className="flex items-center gap-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-200 transition-colors"
                aria-label="Generate image"
              >
                <ImageIcon className="w-5 h-5 text-cyan-400" />
                <span>Generate Image</span>
              </button>
              <button
                onClick={handleSelectDeepResearchMode}
                className="flex items-center gap-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-200 transition-colors"
                aria-label="Deep research"
              >
                <SearchWebIcon className="w-5 h-5 text-purple-400" />
                <span>Deep Research</span>
              </button>
              <button
                onClick={handleUploadFileClick}
                className="flex items-center gap-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Upload file"
                disabled={uploadedFiles.length > 0}
              >
                <PaperClipIcon className="w-5 h-5 text-gray-400" />
                <span>Upload File</span>
              </button>
            </div>
          )}
          <InputBar
            onSendMessage={(text) => handleUserInput(text, uploadedFiles)}
            isMicOn={isMicEnabled}
            onMicToggle={handleMicToggle}
            onFileChange={handleFileChange}
            uploadedFiles={uploadedFiles}
            onRemoveFile={handleRemoveFile}
            isImageMode={isImageMode}
            isDeepResearchMode={isDeepResearchMode}
            onActionToggle={handleActionToggle}
            fileInputRef={fileInputRef}
            onCancelMode={handleCancelMode}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
