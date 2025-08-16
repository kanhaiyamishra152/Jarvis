

import {
  GoogleGenAI,
  Part,
  Content,
  GenerateContentResponse,
  Type,
} from '@google/genai';
import { type FileData, type Message, type ChatSession } from '../types';

let genAI: GoogleGenAI;
let initError: Error | null = null;

try {
  // This code runs in a browser environment. Vercel's build process is expected
  // to replace `process.env.API_KEY` with the value from Environment Variables.
  // If `process` is not defined or the API_KEY is missing, it will result in an error.
  const apiKey = (typeof process !== 'undefined' && process.env ? process.env.API_KEY : undefined);
  if (!apiKey) {
    throw new Error('API_KEY is missing. Please configure it in your Vercel deployment settings.');
  }
  genAI = new GoogleGenAI({ apiKey });
} catch (error) {
  console.error('Failed to initialize AI client:', error);
  initError = error instanceof Error ? error : new Error('An unknown error occurred during AI client initialization.');
}


const getSystemInstruction = (isDeepResearch: boolean = false) => {
    const now = new Date();
    const timeZone = 'Asia/Kolkata';
    const timeFormatter = new Intl.DateTimeFormat('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone,
    });
    const dateFormatter = new Intl.DateTimeFormat('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone,
    });

    const currentTime = timeFormatter.format(now);
    const currentDate = dateFormatter.format(now);

    let instruction = `You are Jarvis, a highly intelligent and helpful AI assistant. Your user is based in India. Your primary goal is to provide concise, accurate, and helpful responses by effectively using your available tools and the conversation history.

**Core Directives:**
1.  **Maintain Context:** You **MUST** pay close attention to the entire conversation history provided. Use the context of previous messages to understand the user's intent, carry on the conversation, and provide relevant follow-up answers. Do not ask for information that has already been provided.

2.  **Tool Use is Mandatory for Real-World Data:** For any query that involves real-time information, recent events, or objective facts about the world, you **MUST** use your search tool. Do not claim you cannot access real-time data. This includes, but is not limited to:
    - **News & Current Events:** "What are the latest headlines?", "Who won the match yesterday?"
    - **Weather & Temperature:** "What's the weather like?", "What is the temperature in Mumbai?" If no location is specified for weather, default to **New Delhi, India**.
    - **Factual Lookups:** "Who is the CEO of Google?", "What is the capital of Japan?", "Explain quantum computing."
    - **Verifying Information:** If the user presents a fact and you are not certain, use the search tool to verify it before confirming or denying. Never dismiss a user's query without searching first.

3.  **Time and Date Information:** You have been provided with the user's current, precise time and date.
    - **Current Time:** ${currentTime} (IST)
    - **Current Date:** ${currentDate}
    - You **MUST** use this information directly when asked for the time or date. **DO NOT** use your search tool for these specific queries.

4.  **Source Prioritization:** When your search tool returns results, give strong preference to information from reliable sources like **Wikipedia** for encyclopedic or factual queries.

5.  **Formatting:** Always format your responses for clarity. Use markdown for code, lists, and tables. Highlight important terms using **double asterisks**.`;
    
    if (isDeepResearch) {
        instruction += `

**Deep Research Mode Directives:**
When the user requests deep research on a topic, you must perform a comprehensive, multi-faceted investigation. Your goal is to go beyond surface-level answers and provide a detailed synthesis of information.

**Your Process for Deep Research:**
1.  **Define and Scope:** Clearly state the topic you are researching based on the user's prompt.
2.  **Systematic Search:** Use your search tool extensively to gather information from various reliable sources. Prioritize academic journals, reputable news organizations, official documentation, and expert analysis.
3.  **Analyze and Synthesize:** Do not just list facts. You must analyze the information, identify key themes, different perspectives, and any contradictions or inconsistencies.
4.  **Structure the Report:** Organize your findings into a clear, well-structured report using markdown. Use headings, subheadings, bullet points, and bold text to improve readability.
5.  **Formulate a Conclusion:** End your report with a summary of the key findings and your own synthesized conclusion based on the evidence you've gathered. This should provide a nuanced understanding of the topic.

You are expected to produce a detailed and insightful report, not just a simple answer.`;
    }

    instruction += `\n\nBy following these directives, you will provide accurate, up-to-date, and trustworthy information. Do not state that you cannot perform a search or access live data; your search tool is always available for these tasks.`;
    
    return instruction;
};

const checkInitialization = () => {
    if (initError) throw initError;
    if (!genAI) throw new Error('AI Service is not available. Initialization failed without a specific error.');
};

export const generateDetailedImagePrompt = async (simplePrompt: string): Promise<string> => {
    checkInitialization();
    try {
        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{
                role: 'user',
                parts: [{ text: simplePrompt }]
            }],
            config: {
                systemInstruction: `You are an elite AI prompt engineer, a fusion of a master visual director, a world-knowledge expert, and a photorealism artist. Your critical mission is to translate a user's simple concept into a breathtakingly detailed, vivid, and logically coherent prompt for an advanced AI image generator. The resulting image must be of 4K photorealistic quality and grounded in reality. You must prevent visual absurdities and inaccuracies.

**Core Directive: Realism and Logical Coherence**
This is your most important rule. Before finalizing any prompt, you **MUST** perform a "reality check."
- **Astronomical Accuracy:** If the scene is in space, ensure it's accurate. There is only one Moon and one Earth. The Earth's night side has visible city lights. The sky on the Moon is black with stars, not blue.
- **Physical Plausibility:** Objects and characters should interact with their environment realistically (e.g., a dog on the moon would be in a spacesuit and experience low gravity).
- **Avoid Contradictions:** Do not generate prompts with conflicting elements (e.g., a "sunken ship floating in the sky").

**Mandatory Quality Keywords:** Unless the user specifies a conflicting style (like 'cartoon' or 'sketch'), you **MUST** embed these keywords naturally within the prompt: '4K resolution', 'hyper-detailed', 'cinematic lighting', 'photorealistic', 'masterpiece', 'professional photography', 'tack-sharp focus'.

**Your Creative Process:**
1.  **Deconstruct the Core Idea:** Isolate the user's primary subject, action, and setting. Ignore all conversational filler.
2.  **Enrich with World Knowledge:** Use your vast knowledge to add contextually accurate and enriching details. If it's a "dog on the moon," describe the fine, grey lunar dust (regolith), the stark shadows from the single light source (the sun), and the stunning view of the Earth from the lunar surface, complete with swirling clouds and glowing city lights on its dark side.
3.  **Direct the Shot:** Define the scene like a film director. Specify the camera angle (e.g., dramatic low-angle shot), the lens (e.g., wide-angle 24mm lens), and the lighting (e.g., harsh, direct sunlight creating deep shadows, with Earthlight providing a soft secondary fill light).
4.  **Inject Quality & Realism:** Weave in the mandatory keywords and add sensory details: the texture of a spacesuit, the silence of the vacuum, the brilliant glare of the sun.
5.  **Final Reality Check:** Read your prompt one last time. Does it make sense? Is it free of logical errors? Is it ready to create a masterpiece?

**Output Format:**
- Your output **MUST** be a single, concise paragraph of the final prompt.
- **DO NOT** include any pre-amble, explanations, or conversational text. Your response is only the prompt itself.`,
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error in generateDetailedImagePrompt:", error);
        throw new Error("I had some trouble brainstorming a detailed prompt. Please try again.");
    }
};


export const generateEmailDraft = async (userInput: string): Promise<{ recipient: string; subject: string; body: string; }> => {
  checkInitialization();
  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [{ text: `From the following request, extract the recipient's email address, the subject line, and the body of the email. Request: "${userInput}"` }]
      }],
      config: {
        systemInstruction: "You are an email assistant. Your task is to extract email details from a user's prompt and return them as a JSON object. For any missing fields (recipient, subject, body), use an empty string for that field's value.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recipient: { type: Type.STRING, description: "The recipient's full email address." },
            subject: { type: Type.STRING, description: "The subject line of the email." },
            body: { type: Type.STRING, description: "The content for the email body." }
          },
          required: ["recipient", "subject", "body"]
        }
      }
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
      throw new Error("Could not extract email details.");
    }
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error in generateEmailDraft:", error);
    throw new Error("I had some trouble understanding the email details. Please try again.");
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
    checkInitialization();
    try {
        const response = await genAI.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });
        
        if (!response.generatedImages || response.generatedImages.length === 0) {
            throw new Error("Image generation failed to produce an image.");
        }

        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return base64ImageBytes;

    } catch (error) {
        console.error("Error in generateImage:", error);
        throw new Error("Sorry, I was unable to create the image. There might be an issue with the generation service.");
    }
};


export const generateResponseStream = async (
  allChats: ChatSession[],
  activeChatId: string | null,
  message: string,
  filesData: FileData[],
  options?: { deepResearch?: boolean }
): Promise<AsyncIterable<GenerateContentResponse>> => {
  checkInitialization();

  const activeChat = allChats.find(chat => chat.id === activeChatId);
  const history = activeChat ? activeChat.messages : [];
  
  const contents: Content[] = history
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.text }],
    }));

  const userParts: Part[] = [];
  if (filesData && filesData.length > 0) {
    filesData.forEach(fileData => {
        userParts.push({
            inlineData: {
                mimeType: fileData.type,
                data: fileData.data,
            },
        });
    });
  }
  userParts.push({ text: message });
  contents.push({ role: 'user', parts: userParts });

  // --- PERFORMANCE IMPROVEMENT ---
  // Conditionally enable tools only when needed to reduce latency.
  const config: any = {
    systemInstruction: getSystemInstruction(options?.deepResearch),
  };
  
  // Only enable Google Search for deep research mode to keep standard chat fast.
  if (options?.deepResearch) {
    config.tools = [{ googleSearch: {} }];
  }

  const result = await genAI.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents,
    config,
  });

  return result;
};
