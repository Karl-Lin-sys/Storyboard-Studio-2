import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings, User, Bot, Loader2 } from 'lucide-react';
import { ChatMessage } from '../types';

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  
  // Settings
  const [model, setModel] = useState('gemini-3.1-flash-lite');
  const [systemInstruction, setSystemInstruction] = useState('You are an expert director and storyboard artist helping refine a script and scene ideas.');
  const [showSettings, setShowSettings] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', parts: [{ text: userMsg }] }
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Exclude the very last user message from history for the API call
      // or pass the entire thing minus the last, plus message
      const history = messages; 
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history,
          message: userMsg,
          modelName: model,
          systemInstruction
        })
      });

      if (!res.ok) throw new Error('Chat API failed');
      const data = await res.json();
      
      setMessages(prev => [
        ...prev,
        { role: 'model', parts: [{ text: data.text }] }
      ]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { role: 'model', parts: [{ text: '*Sorry, an error occurred.*' }] }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-slate-900 border-l border-slate-800 transition-all duration-300 ${isOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
      <div className="flex-none p-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="font-display font-semibold text-white tracking-tight">AI Assistant</h2>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <Settings size={18} />
        </button>
      </div>

      {showSettings && (
        <div className="flex-none p-4 bg-slate-800/50 border-b border-slate-700 text-sm space-y-4">
          <div>
            <label className="block text-slate-400 mb-1 text-xs uppercase tracking-wider">Model</label>
            <select 
              value={model} 
              onChange={e => setModel(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-md py-1.5 px-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="gemini-3.1-pro-preview">Pro (Complex Tasks)</option>
              <option value="gemini-3.5-flash">Flash (General)</option>
              <option value="gemini-3.1-flash-lite">Flash Lite (Fast)</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1 text-xs uppercase tracking-wider">System Instruction</label>
            <textarea 
              value={systemInstruction}
              onChange={e => setSystemInstruction(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-md py-1.5 px-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[60px] text-xs resize-y"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 text-sm mt-8">
            Send a message to discuss your script or brainstorm scene ideas.
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`flex-none w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-700'}`}>
              {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
            </div>
            <div className={`flex-1 rounded-2xl px-4 py-2 ${msg.role === 'user' ? 'bg-blue-600/20 text-blue-100' : 'bg-slate-800 text-slate-200'} text-sm leading-relaxed whitespace-pre-wrap`}>
              {msg.parts[0].text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
             <div className="flex-none w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                <Bot size={16} className="text-white" />
             </div>
             <div className="flex items-center px-4 py-2 rounded-2xl bg-slate-800 text-slate-400">
                <Loader2 size={16} className="animate-spin" />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-none p-4 border-t border-slate-800 bg-slate-900/50">
        <form onSubmit={handleSend} className="relative">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-full py-2.5 pl-4 pr-12 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 disabled:opacity-50 text-sm"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
