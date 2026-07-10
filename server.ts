import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import * as dotenv from 'dotenv';
import multer from 'multer';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const upload = multer({ storage: multer.memoryStorage() });

// Extract scenes from the script
app.post('/api/extract-scenes', upload.single('scriptFile'), async (req, res) => {
  try {
    let scriptContent = req.body.scriptText;
    
    if (req.file) {
      scriptContent = req.file.buffer.toString('utf-8');
    }

    if (!scriptContent) {
      return res.status(400).json({ error: 'No script content provided.' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `You are an expert storyboard artist. Break down the following script into a sequence of distinct visual scenes for a storyboard. For each scene, provide a highly descriptive visual prompt that can be used to generate an image. Focus on lighting, camera angle, character action, and setting.

Script:
${scriptContent}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sceneNumber: { type: Type.INTEGER },
              visualPrompt: { type: Type.STRING, description: 'A highly descriptive visual prompt for image generation.' },
              summary: { type: Type.STRING, description: 'A short summary of the scene action.' }
            },
            required: ['sceneNumber', 'visualPrompt', 'summary']
          }
        }
      }
    });

    const scenes = JSON.parse(response.text);
    res.json({ scenes });
  } catch (error: any) {
    console.error('Error extracting scenes:', error);
    res.status(500).json({ error: error.message || 'Failed to extract scenes' });
  }
});

// Generate a single image
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, imageSize = '1K' } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: prompt,
      config: {
        imageConfig: {
          aspectRatio: '16:9',
          imageSize: imageSize // '1K', '2K', or '4K'
        }
      }
    });

    let imageUrl = '';
    
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: 'No image data returned from model' });
    }

    res.json({ imageUrl });
  } catch (error: any) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: error.message || 'Failed to generate image' });
  }
});

// Chatbot endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { history, message, modelName, systemInstruction } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const model = modelName || 'gemini-3.1-flash-lite';
    
    const chat = ai.chats.create({
      model: model,
      history: history || [],
      config: {
        systemInstruction: systemInstruction || 'You are a helpful assistant.',
      }
    });

    const response = await chat.sendMessage({ message });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: error.message || 'Chat failed' });
  }
});


async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
