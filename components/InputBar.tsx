import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, MicIcon, MicOffIcon, PaperClipIcon, CloseIcon, PlusIcon } from './Icons';
import { type FileData } from '../types';

interface InputBarProps {
  onSendMessage: (text: string) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  uploadedFiles: FileData[];
  onRemoveFile: (fileName: string) => void;
  isMicOn: boolean;
  onMicToggle: () => void;
  isImageMode: boolean;
  isDeepResearchMode: boolean;
  onActionToggle: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onCancelMode: () => void;
}

const InputBar: React.FC<InputBarProps> = ({
  onSendMessage,
  onFileChange,
  uploadedFiles,
  onRemoveFile,
  isMicOn,
  onMicToggle,
  isImageMode,
  isDeepResearchMode,
  onActionToggle,
  fileInputRef,
  onCancelMode,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      // Cap height at roughly 5 lines (10rem)
      const maxHeight = 160; 
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [text]);

  const handleSend = () => {
    if (text.trim() || uploadedFiles.length > 0) {
      onSendMessage(text);
      setText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const placeholderText = isImageMode 
    ? "Describe the image you want to create..." 
    : isDeepResearchMode
    ? "Enter a topic for deep research..."
    : "Type a message or say 'Hey Jarvis'...";

  const isAnyModeActive = isImageMode || isDeepResearchMode;

  return (
    <div className="p-4 border-t border-blue-500/20 bg-gray-900/30">
        {(isImageMode || isDeepResearchMode) && (
            <div className="px-1 pb-2 flex">
                {isImageMode && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold bg-cyan-500/20 text-cyan-300 pl-2.5 pr-1.5 py-1 rounded-full">
                        Image Mode
                        <button onClick={onCancelMode} className="p-0.5 rounded-full hover:bg-black/20 transition-colors" aria-label="Cancel image mode">
                            <CloseIcon className="w-3.5 h-3.5" />
                        </button>
                    </span>
                )}
                {isDeepResearchMode && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold bg-purple-500/20 text-purple-300 pl-2.5 pr-1.5 py-1 rounded-full">
                        Deep Research Mode
                        <button onClick={onCancelMode} className="p-0.5 rounded-full hover:bg-black/20 transition-colors" aria-label="Cancel deep research mode">
                            <CloseIcon className="w-3.5 h-3.5" />
                        </button>
                    </span>
                )}
            </div>
        )}
      {uploadedFiles.length > 0 && (
        <div className="mb-2 space-y-2 max-h-28 overflow-y-auto pr-2">
            {uploadedFiles.map(file => (
              <div key={file.name} className="flex items-center justify-between text-xs text-cyan-300 px-3 py-1.5 bg-gray-800/70 rounded-md border border-gray-700">
                <span className="truncate pr-2">
                  <span className="font-semibold">{file.name}</span>
                </span>
                <button
                  onClick={() => onRemoveFile(file.name)}
                  className="p-1 -mr-1 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors flex-shrink-0"
                  aria-label={`Remove ${file.name}`}
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
        </div>
      )}
      <div className={`flex items-end bg-gray-800/50 rounded-lg px-2 py-1 border border-gray-700 focus-within:border-cyan-400 transition-colors ${isImageMode ? 'border-cyan-500/50' : ''} ${isDeepResearchMode ? 'border-purple-500/50' : ''}`}>
        
        <button
          onClick={onActionToggle}
          className={`p-2 self-center cursor-pointer transition-colors text-gray-400 hover:text-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label="Toggle actions menu"
          disabled={uploadedFiles.length > 0}
        >
          <PlusIcon className="w-5 h-5" />
        </button>

        <input id="file-upload" type="file" multiple className="hidden" onChange={onFileChange} ref={fileInputRef} disabled={uploadedFiles.length > 0 || isAnyModeActive}/>
        
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholderText}
          className="flex-1 bg-transparent p-2 text-gray-200 placeholder-gray-500 focus:outline-none resize-none"
          rows={1}
        />
        <div className="flex self-end">
            <button
              onClick={handleSend}
              className="p-2 text-gray-400 hover:text-cyan-300 disabled:text-gray-600 disabled:cursor-not-allowed"
              disabled={!text.trim() && uploadedFiles.length === 0}
              aria-label="Send message"
            >
              <SendIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onMicToggle}
              className={`p-2 transition-colors ${isMicOn ? 'text-cyan-400 hover:text-cyan-300' : 'text-gray-500 hover:text-gray-300'}`}
              aria-label={isMicOn ? 'Turn off microphone' : 'Turn on microphone'}
            >
              {isMicOn ? <MicIcon className="w-5 h-5" /> : <MicOffIcon className="w-5 h-5" />}
            </button>
        </div>
      </div>
    </div>
  );
};

export default InputBar;