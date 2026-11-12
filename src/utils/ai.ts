import { GoogleGenAI } from '@google/genai';

function getApiKey(): string {
  const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as Record<string, string | undefined>);
  return (
    metaEnv.VITE_GEMINI_API_KEY ||
    metaEnv.GEMINI_API_KEY ||
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    ''
  );
}

export function hasGeminiKey(): boolean {
  const key = getApiKey();
  return typeof key === 'string' && key.trim().length > 0 && key !== 'MY_GEMINI_API_KEY';
}

export async function askAboutPage(selectedText: string, pageContext: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return 'Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.';
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `You are a knowledgeable, spoiler-free reading assistant for George R.R. Martin's "A Game of Thrones".
The reader has selected this excerpt:
"${selectedText}"

Context from the current page:
"${pageContext.slice(0, 1500)}"

Explain this excerpt or answer questions about what is happening here in 1 to 3 concise, clear sentences. Avoid future plot spoilers beyond this point.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    return response.text || 'No response generated.';
  } catch (error: unknown) {
    console.error('Gemini error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return `AI request failed: ${msg}`;
  }
}

export async function lookupCharacter(name: string, chapterTitle: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return 'Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.';
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `You are a lore master for George R.R. Martin's "A Song of Ice and Fire".
The reader is reading "${chapterTitle}" in the first book "A Game of Thrones".
They want to know who this character or house is: "${name}".

Provide a brief, 2-3 sentence overview of who they are, their house/allegiance, and their role at this point in the story without spoiling future events or deaths from subsequent chapters or books.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    return response.text || 'No description found.';
  } catch (error: unknown) {
    console.error('Gemini character lookup error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return `Character lookup failed: ${msg}`;
  }
}
