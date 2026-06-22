import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing body
  app.use(express.json());

  // Secure server-side Gemini Proxy API
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history, contextData } = req.body;
      if (!message) {
        return res.status(400).json({ error: "El mensaje es obligatorio." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("GEMINI_API_KEY is not configured.");
        return res.status(500).json({ 
          error: "API Key de Gemini no configurada en el servidor. Por favor, agregue GEMINI_API_KEY en la sección Settings > Secrets." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `
        You are an expert financial assistant for the app ICASH_PLUS.
        Your goal is to help the user understand their finances based on the provided data.
        
        DATA CONTEXT (JSON):
        ${contextData || "No financial data available."}

        INSTRUCTIONS:
        1. Answer concisely and professionally.
        2. Use the provided data to answer questions about balances, spending, income, and net worth.
        3. If a user asks something not in the data, politely say you don't have that information.
        4. Format currency correctly (HNL for Lempiras, USD for Dollars).
        5. Speak in Spanish (Español) as the app is in Spanish.
      `;

      // Map chat history so it is compliant with Gemini API schema
      const historyParts = (history || [])
        .filter((h: any) => h.id !== 'welcome')
        .map((h: any) => ({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.text }]
        }));

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          ...historyParts,
          { role: "user", parts: [{ text: message }] }
        ],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      const textOutput = response.text || "Lo siento, no pude procesar la respuesta.";
      return res.json({ text: textOutput });
    } catch (error: any) {
      console.error("Error in server-side Gemini API call:", error);
      return res.status(500).json({ 
        error: error.message || "Error al comunicarse con el asistente de IA." 
      });
    }
  });

  // Serve static assets and/or use Vite dev middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
