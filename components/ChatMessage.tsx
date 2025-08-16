
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { type Message, type MessageMode } from '../types';
import CodeBlock from './CodeBlock';
import ImageGenerationDisplay from './ImageGenerationDisplay';
import { UserIcon, AssistantIcon, SystemIcon, CopyIcon, CheckIcon, SourceIcon, SpeakerWaveIcon, PencilIcon, PaperClipIcon } from './Icons';

// KaTeX is loaded from a CDN in index.html. We will check for its existence on the window object before using it.

interface ChatMessageProps {
  message: Message;
  speak: (text: string, messageId: string) => void;
  stopSpeaking: () => void;
  speakingMessageId: string | null;
  onEdit: (messageId: string, newText: string) => void;
  onImageRegenerate: (messageId: string) => void;
  onImageCancel: (messageId: string) => void;
  onImageConfirm: (messageId: string, confirmed: boolean) => void;
}

const MathComponent: React.FC<{ tex: string, displayMode: boolean }> = ({ tex, displayMode }) => {
    const html = useMemo(() => {
        try {
            // Check if KaTeX is loaded and available on the window object.
            if (typeof (window as any).katex !== 'undefined') {
                return (window as any).katex.renderToString(tex, {
                    throwOnError: false,
                    displayMode,
                });
            }
            // If KaTeX is not loaded, return the raw TeX string as a fallback.
            // This prevents the application from crashing.
            return tex;
        } catch (e) {
            console.error("KaTeX rendering error:", e);
            return tex;
        }
    }, [tex, displayMode]);

    return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

const GroundingSources: React.FC<{ sources: any[] }> = ({ sources }) => {
    if (!sources || sources.length === 0) return null;

    return (
        <div className="mt-3 pt-3 border-t border-gray-700">
            <h4 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2">
                <SourceIcon className="w-4 h-4"/>
                Sources
            </h4>
            <ul className="text-xs space-y-1">
                {sources.map((source, index) => (
                    <li key={index} className="truncate">
                        <a 
                          href={source.web?.uri} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-cyan-400 hover:underline"
                          title={source.web?.title}
                        >
                          {source.web?.title || source.web?.uri}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
};


const ChatMessage: React.FC<ChatMessageProps> = ({ 
    message, 
    speak, 
    stopSpeaking, 
    speakingMessageId, 
    onEdit,
    onImageRegenerate,
    onImageCancel,
    onImageConfirm
}) => {
  const { id, role, text, fileInfos, groundingMetadata, imageGenData, mode } = message;
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const modeLabels: Record<MessageMode, string> = {
    image_gen: 'image gen',
    deep_research_gen: 'deep research gen',
  };
  const modeLabel = mode ? modeLabels[mode] : null;

  useEffect(() => {
      if (isEditing && textareaRef.current) {
          const textarea = textareaRef.current;
          textarea.style.height = 'auto';
          textarea.style.height = `${textarea.scrollHeight}px`;
          textarea.focus();
      }
  }, [isEditing]);
  
  const handleCopy = () => {
    const textToCopy = imageGenData ? imageGenData.prompt : text;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => console.error('Failed to copy text: ', err));
  };

  const isThisMessageSpeaking = speakingMessageId === id;

  const handleSpeakerClick = () => {
      if (isThisMessageSpeaking) {
          stopSpeaking();
      } else {
          speak(text, id);
      }
  };
  
  const handleSaveEdit = () => {
      if (editedText.trim() !== text) {
          onEdit(id, editedText.trim());
      }
      setIsEditing(false);
  };
  
  const handleCancelEdit = () => {
      setEditedText(text);
      setIsEditing(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSaveEdit();
      } else if (e.key === 'Escape') {
          handleCancelEdit();
      }
  };


  const renderContent = () => {
    const regex = /(```[\s\S]*?```|\$\$[\s\S]*?\$\$|\$.*?\$|\*\*.*?\*\*)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
        if (!part) return null;

        if (part.startsWith('```') && part.endsWith('```')) {
            const codeMatch = part.match(/```(\w*)\n([\s\S]*?)```/);
            if (codeMatch) {
                const [, language, code] = codeMatch;
                return <CodeBlock key={index} language={language} code={code.trim()} />;
            }
            return <CodeBlock key={index} code={part.replace(/```/g, '').trim()} />;
        }
        
        if (part.startsWith('$$') && part.endsWith('$$')) {
            return <MathComponent key={index} tex={part.slice(2, -2)} displayMode={true} />;
        }
        
        if (part.startsWith('$') && part.endsWith('$')) {
            return <MathComponent key={index} tex={part.slice(1, -1)} displayMode={false} />;
        }

        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-semibold text-cyan-300">{part.slice(2, -2)}</strong>;
        }

        return <span key={index}>{part}</span>;
    });
  };
  
  const isUser = role === 'user';
  const isSystem = role === 'system';
  const isAssistant = role === 'assistant';

  if (isSystem) {
      return (
          <div className="flex justify-center items-center">
              <div className="text-xs text-gray-400 italic bg-gray-800 px-3 py-1 rounded-full flex items-center gap-2">
                  <SystemIcon className="w-4 h-4" />
                  <span>{text}</span>
              </div>
          </div>
      );
  }

  return (
    <div className={`group flex items-start gap-4 ${isUser ? 'justify-end' : ''}`}>
      {isAssistant && (
        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex-shrink-0 flex items-center justify-center">
          <AssistantIcon className="w-5 h-5 text-cyan-300" />
        </div>
      )}
      <div className={`relative max-w-2xl w-full ${isUser ? 'bg-blue-600/50' : 'bg-gray-800/80'} rounded-xl overflow-hidden shadow-md`}>
        {modeLabel && (
          <div className="absolute top-1.5 right-3 text-xs text-gray-400/80 font-mono select-none pointer-events-none">
            {modeLabel}
          </div>
        )}
        <div className={`prose prose-invert prose-sm max-w-none text-gray-300 whitespace-pre-wrap leading-relaxed ${!imageGenData ? 'p-4' : 'p-0'}`}>
          {isEditing ? (
              <div className="p-4">
                <textarea
                    ref={textareaRef}
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-gray-900/50 border border-cyan-400 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-cyan-300 resize-none"
                    rows={1}
                />
              </div>
          ) : imageGenData ? (
            <ImageGenerationDisplay 
                data={imageGenData}
                onRegenerate={() => onImageRegenerate(id)}
                onCancel={() => onImageCancel(id)}
                onConfirm={(confirmed) => onImageConfirm(id, confirmed)}
            />
          ) : (
             <>{renderContent()}</>
          )}
          {fileInfos && fileInfos.length > 0 && (
            <div className={`mt-3 pt-3 border-t border-gray-600/50 ${!imageGenData ? '' : 'p-4'}`}>
              <h4 className="text-xs font-semibold text-gray-400 mb-2">Attachments:</h4>
              <ul className="space-y-1.5">
                {fileInfos.map((file, index) => (
                  <li key={index} className="text-xs text-gray-300 flex items-center gap-2">
                    <PaperClipIcon className="w-4 h-4 text-gray-500" />
                    <span className="truncate">{file.name} ({file.type})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {groundingMetadata && !imageGenData && (
             <div className="p-4 border-t border-gray-700/50">
                <GroundingSources sources={groundingMetadata} />
            </div>
          )}
        </div>
        
        {isAssistant && !message.isStreaming && text && !imageGenData && (
          <div className="border-t border-gray-700/50 px-4 py-2 flex justify-end items-center gap-4 bg-gray-800/10">
            <button
                onClick={handleSpeakerClick}
                className={`flex items-center gap-1.5 text-xs ${isThisMessageSpeaking ? 'text-cyan-400' : 'text-gray-400 hover:text-white'} transition-colors`}
                aria-label={isThisMessageSpeaking ? 'Stop speaking' : 'Read message aloud'}
            >
                <SpeakerWaveIcon className={`w-4 h-4 ${isThisMessageSpeaking ? 'animate-pulse' : ''}`} />
                <span>{isThisMessageSpeaking ? 'Speaking...' : 'Speak'}</span>
            </button>
            <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                aria-label="Copy message"
            >
              {isCopied ? (
                <>
                  <CheckIcon className="w-4 h-4 text-green-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <CopyIcon className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}
        {isEditing && (
          <div className="border-t border-gray-700/50 px-4 py-2 flex justify-end items-center gap-2 bg-gray-800/10">
              <button onClick={handleCancelEdit} className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
              <button onClick={handleSaveEdit} className="px-3 py-1 text-xs bg-cyan-600 hover:bg-cyan-500 rounded-md">Save</button>
          </div>
        )}
      </div>
       {isUser && !isEditing && (
        <div className="flex items-center gap-2">
            <button onClick={() => setIsEditing(true)} className="p-1 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Edit message">
                <PencilIcon className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-gray-300" />
            </div>
        </div>
      )}
      {isUser && isEditing && (
          <div className="w-8 h-8 flex-shrink-0"></div>
      )}
    </div>
  );
};

export default ChatMessage;
