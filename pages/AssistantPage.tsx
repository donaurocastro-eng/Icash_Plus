import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Send, Bot, User, Sparkles, AlertCircle, RefreshCcw } from 'lucide-react';
import { AccountService } from '../services/accountService';
import { TransactionService } from '../services/transactionService';
import { PropertyService } from '../services/propertyService';
import { ContractService } from '../services/contractService';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

const AssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Hola. Soy tu asistente financiero personal de ICASH_PLUS. He analizado tus cuentas, movimientos y propiedades. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use 'any' for the chat session ref to avoid strict type import issues at runtime
  const chatSession = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const gatherFinancialContext = async () => {
    try {
      const [accounts, transactions, properties, contracts] = await Promise.all([
        AccountService.getAll(),
        TransactionService.getAll(),
        PropertyService.getAll(),
        ContractService.getAll()
      ]);

      // Summarize Transactions (Last 50)
      const recentTx = transactions.slice(0, 50).map(t => ({
        date: t.date,
        desc: t.description,
        amount: t.amount,
        type: t.type,
        cat: t.categoryName,
        acc: t.accountName
      }));

      // Summarize Data for AI
      const contextData = {
        currentDate: new Date().toISOString().split('T')[0],
        accounts: accounts.map(a => ({ name: a.name, balance: a.initialBalance, currency: a.currency, type: a.type })),
        properties: properties.map(p => ({ name: p.name, value: p.value, currency: p.currency })),
        activeContracts: contracts.filter(c => c.status === 'ACTIVE').map(c => ({
            amount: c.amount, 
            nextPay: c.nextPaymentDate
        })),
        recentTransactions: recentTx
      };

      return JSON.stringify(contextData);
    } catch (e) {
      console.error("Error gathering context", e);
      return "Error loading financial data.";
    }
  };

  const initializeChat = async () => {
    setInitializing(true);
    setError(null);
    try {
      // Safe access to process.env to prevent ReferenceError in strict browser environments
      let apiKey = '';
      try {
        if (typeof process !== 'undefined' && process.env) {
            apiKey = process.env.API_KEY || '';
        }
      } catch (e) {
        console.warn("Process env not available", e);
      }

      if (!apiKey) throw new Error("API Key not found. Ensure API_KEY is set in the environment.");

      const contextData = await gatherFinancialContext();
      
      const ai = new GoogleGenAI({ apiKey });
      
      const systemInstruction = `
        You are an expert financial assistant for the app ICASH_PLUS.
        Your goal is to help the user understand their finances based on the provided data.
        
        DATA CONTEXT (JSON):
        ${contextData}

        INSTRUCTIONS:
        1. Answer concisely and professionally.
        2. Use the provided data to answer questions about balances, spending, income, and net worth.
        3. If a user asks something not in the data, politely say you don't have that information.
        4. Format currency correctly (HNL for Lempiras, USD for Dollars).
        5. You can use Markdown for bolding lists or key figures.
        6. Speak in Spanish (Español) as the app is in Spanish.
      `;

      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      chatSession.current = chat;
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to initialize AI.");
    } finally {
      setInitializing(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || loading || !chatSession.current) return;

    const userText = inputValue;
    setInputValue('');
    
    // Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const result = await chatSession.current.sendMessage({ message: userText });
      const aiText = result.text;
      
      // Add AI Message
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: aiText || 'Lo siento, no pude generar una respuesta.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);

    } catch (err: any) {
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        text: `Error: ${err.message || 'Ocurrió un error al conectar con el asistente.'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-md">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Asistente Financiero AI</h2>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              Potenciado por Gemini 2.5 Flash
              {initializing && <span className="animate-pulse"> (Iniciando...)</span>}
            </p>
          </div>
        </div>
        <button 
          onClick={initializeChat} 
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
          title="Reiniciar chat"
        >
          <RefreshCcw size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
        {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm flex items-center gap-2">
                <AlertCircle size={18} />
                <span>{error}</span>
            </div>
        )}
        
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[85%] md:max-w-[70%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-100 text-indigo-600'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div 
                className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                }`}
              >
                {/* Simple rendering for newlines */}
                {msg.text.split('\n').map((line, i) => (
                  <p key={i} className={line ? "min-h-[1.2em]" : "h-2"}>{line}</p>
                ))}
                <span className={`text-[10px] block mt-2 opacity-60 ${msg.role === 'user' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex w-full justify-start">
             <div className="flex gap-3 max-w-[80%]">
                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
                    <Bot size={16} />
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <form onSubmit={handleSend} className="relative flex items-center gap-2">
          <input
            type="text"
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
            placeholder="Pregunta sobre tus finanzas..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading || initializing}
          />
          <button 
            type="submit"
            disabled={loading || initializing || !inputValue.trim()}
            className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-colors shadow-sm"
          >
            <Send size={18} />
          </button>
        </form>
        <div className="text-center mt-2">
             <p className="text-[10px] text-slate-400">La IA puede cometer errores. Verifica la información importante.</p>
        </div>
      </div>
    </div>
  );
};

export default AssistantPage;