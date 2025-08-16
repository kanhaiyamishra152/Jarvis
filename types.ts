
export type MessageMode = 'image_gen' | 'deep_research_gen';

export interface ImageGenerationData {
  status: 'confirming_prompt' | 'generating' | 'done' | 'error';
  prompt: string; // The prompt to be used for generation
  originalPrompt: string; // The user's initial prompt
  images: { url: string; prompt: string }[]; // History of generated images
  error?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  isStreaming?: boolean;
  fileInfos?: {
    name:string;
    type: string;
  }[];
  groundingMetadata?: any[];
  imageGenData?: ImageGenerationData;
  mode?: MessageMode;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  messages: Message[];
}

export type AIState = 'idle' | 'listening' | 'thinking' | 'speaking';

export type SearchState = 'idle' | 'searching' | 'synthesizing';

export interface FileData {
    name: string;
    type: string;
    data: string; // base64 encoded
}
