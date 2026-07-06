import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Trash2, Bot, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useDataStore } from '../store/useDataStore';
import toast from 'react-hot-toast';

export function Chatbot() {
  const { user } = useAuthStore();
  const { activePatient, chatHistory, sendChatMessage, clearChatHistory, selectedAIProvider, setSelectedAIProvider } = useDataStore();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [localHistory, setLocalHistory] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const targetPatientId = user?.role === 'elderly' ? user.id : activePatient?.id;
  const targetPatientName = user?.role === 'elderly' ? user.name : activePatient?.name;

  const history = user ? chatHistory : localHistory;

  // Auto-scroll to bottom on new messages or typing state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isTyping, isOpen]);

  const getMockReply = (message: string, role?: string): string => {
    const lowerMsg = message.toLowerCase();
    
    // Health and medicine related broad matching
    const healthKeywords = ['med', 'pill', 'tablet', 'health', 'doctor', 'pain', 'hurt', 'sick', 'fever', 'blood', 'pressure', 'heart', 'sugar', 'diet', 'food', 'symptom', 'disease'];
    const isHealthRelated = healthKeywords.some(keyword => lowerMsg.includes(keyword));

    if (isHealthRelated) {
        if (role === 'caregiver') {
            return "As a caregiver, monitoring medications and symptoms is crucial. Please check the patient's medical profile for schedule details and consult a doctor if new symptoms appear.";
        }
        return "I can help you keep track of your medications and health. Remember to take your medicines on time and always consult your doctor if you feel unwell.";
    }

    if (lowerMsg.includes('help')) {
        if (role === 'caregiver') {
            return "I can help you manage your patient's medications, monitor their vitals, or schedule activities. What do you need assistance with?";
        }
        return "I can remind you of your medications, suggest gentle exercises, or just chat with you. How can I help today?";
    }

    if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
      return `Hello there! I'm CareBuddy, your AI Care Companion. How can I assist you today?`;
    }
    if (lowerMsg.includes('water') || lowerMsg.includes('drink') || lowerMsg.includes('thirsty')) {
      return "Staying hydrated is a wonderful way to boost your energy! Try drinking a glass of water right now if you haven't recently.";
    }
    if (lowerMsg.includes('walk') || lowerMsg.includes('exercise') || lowerMsg.includes('move')) {
      return "A gentle walk or light movement can do wonders for your joints and mood, as long as you feel steady and safe on your feet!";
    }
    if (lowerMsg.includes('sad') || lowerMsg.includes('lonely') || lowerMsg.includes('depressed')) {
      return "I'm right here with you, and you are doing a wonderful job. Remember that your family and caretakers care deeply about you. Let's take a deep breath together.";
    }
    return "I hear you! I'm here to discuss any health, medicine, or wellness topics. Let me know what's on your mind!";
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const msg = inputValue;
    setInputValue('');
    setIsTyping(true);

    if (user && targetPatientId) {
      try {
        await sendChatMessage(targetPatientId, msg);
      } catch (error) {
        console.error('Error sending chatbot message', error);
      } finally {
        setIsTyping(false);
      }
    } else {
      // Unauthenticated / Landing page guest mode
      const userMsg = { sender: 'user', text: msg, timestamp: new Date() };
      setLocalHistory((prev) => [...prev, userMsg]);
      
      // Simulate bot typing delay
      setTimeout(() => {
        const botReply = getMockReply(msg, user?.role);
        const botMsg = { sender: 'bot', text: botReply, timestamp: new Date() };
        setLocalHistory((prev) => [...prev, botMsg]);
        setIsTyping(false);
      }, 1000);
    }
  };

  const handleClear = () => {
    if (window.confirm('Would you like to clear the chat conversation with CareBuddy?')) {
      if (user) {
        clearChatHistory();
      } else {
        setLocalHistory([]);
      }
      toast.success('Conversation history cleared');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Chat Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-rose-500 to-orange-400 text-white rounded-full flex items-center justify-center shadow-xl shadow-rose-300 hover:scale-105 active:scale-95 transition-all animate-float cursor-pointer relative"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Chat with CareBuddy"
      >
        {isOpen ? (
          <X className="w-7 h-7 sm:w-8 sm:h-8" />
        ) : (
          <>
            <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
          </>
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="absolute bottom-20 right-0 w-[calc(100vw-2rem)] sm:w-[400px] h-[550px] max-h-[calc(100vh-8rem)] bg-white rounded-[32px] border border-gray-100 shadow-2xl flex flex-col overflow-hidden glass-card"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-500 to-orange-400 text-white p-5 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-white shadow-inner">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black tracking-tight text-lg leading-tight">CareBuddy</h3>
                    <span className="w-2.5 h-2.5 bg-green-400 rounded-full border border-white animate-pulse" />
                  </div>
                  <p className="text-[11px] font-bold text-rose-100 uppercase tracking-widest leading-none mt-1">
                    {!user ? 'Testing Mode' : user?.role === 'elderly' ? 'Care Companion' : user?.role === 'family' ? `Family: ${targetPatientName}` : `Monitoring: ${targetPatientName}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <select
                  value={selectedAIProvider}
                  onChange={(e) => setSelectedAIProvider(e.target.value as any)}
                  className="bg-white/20 text-white text-[11px] font-bold px-2 py-1.5 rounded-lg border border-white/20 outline-none hover:bg-white/30 transition-colors cursor-pointer mr-1"
                  title="Select AI Provider"
                >
                  <option value="openrouter" className="text-gray-800">🌐 OpenRouter</option>
                  <option value="nvidia" className="text-gray-800">🤖 NVIDIA</option>
                  <option value="groq" className="text-gray-800">⚡ Groq</option>
                  <option value="gemini" className="text-gray-800">🧠 Gemini</option>
                </select>
                {history.length > 0 && (
                  <button
                    onClick={handleClear}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/95 hover:text-white"
                    title="Clear Chat History"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/95 hover:text-white sm:hidden"
                  title="Close Chat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Message History Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center shadow-sm">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-800 text-lg">Hello {!user ? 'there' : user.name}!</h4>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed mt-2">
                      I'm CareBuddy, your AI Care Companion. I'm here to support you!
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 w-full text-left space-y-2.5 shadow-sm">
                    <p className="text-xs font-black text-rose-400 uppercase tracking-wider">Try asking me about:</p>
                    {(!user || user.role === 'elderly') ? (
                      <>
                        <button
                          onClick={() => setInputValue('Can you remind me of my medicines?')}
                          className="w-full text-left p-2.5 text-xs font-bold text-gray-600 hover:text-rose-500 bg-gray-50 hover:bg-rose-50/50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                        >
                          💊 Medicine Details
                        </button>
                        <button
                          onClick={() => setInputValue('What are some tips to stay healthy?')}
                          className="w-full text-left p-2.5 text-xs font-bold text-gray-600 hover:text-rose-500 bg-gray-50 hover:bg-rose-50/50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                        >
                          🏃‍♂️ Activity & Health Tips
                        </button>
                        <button
                          onClick={() => setInputValue('I feel lonely today.')}
                          className="w-full text-left p-2.5 text-xs font-bold text-gray-600 hover:text-rose-500 bg-gray-50 hover:bg-rose-50/50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                        >
                          ❤️ Friendly Conversation
                        </button>
                      </>
                    ) : user.role === 'caregiver' ? (
                      <>
                        <button
                          onClick={() => setInputValue('How can I better manage my patient\'s medications?')}
                          className="w-full text-left p-2.5 text-xs font-bold text-gray-600 hover:text-rose-500 bg-gray-50 hover:bg-rose-50/50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                        >
                          📋 Medication Management
                        </button>
                        <button
                          onClick={() => setInputValue('What are signs of emergency I should look out for?')}
                          className="w-full text-left p-2.5 text-xs font-bold text-gray-600 hover:text-rose-500 bg-gray-50 hover:bg-rose-50/50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                        >
                          ⚠️ Emergency Signs
                        </button>
                        <button
                          onClick={() => setInputValue('How can I encourage my patient to be active?')}
                          className="w-full text-left p-2.5 text-xs font-bold text-gray-600 hover:text-rose-500 bg-gray-50 hover:bg-rose-50/50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                        >
                          🏃‍♂️ Encourage Activity
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setInputValue('How is my loved one doing today?')}
                          className="w-full text-left p-2.5 text-xs font-bold text-gray-600 hover:text-rose-500 bg-gray-50 hover:bg-rose-50/50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                        >
                          ❤️ General Health Update
                        </button>
                        <button
                          onClick={() => setInputValue('What can I do to support their care plan?')}
                          className="w-full text-left p-2.5 text-xs font-bold text-gray-600 hover:text-rose-500 bg-gray-50 hover:bg-rose-50/50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                        >
                          🤝 Support Strategies
                        </button>
                        <button
                          onClick={() => setInputValue('Can you explain their current medications?')}
                          className="w-full text-left p-2.5 text-xs font-bold text-gray-600 hover:text-rose-500 bg-gray-50 hover:bg-rose-50/50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                        >
                          💊 Medicine Explanation
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                history.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2.5 max-w-[85%] ${
                      msg.sender === 'user' ? 'ml-auto justify-end' : ''
                    }`}
                  >
                    {msg.sender === 'bot' && (
                      <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center shrink-0 shadow-inner">
                        <Bot className="w-4.5 h-4.5" />
                      </div>
                    )}
                    <div
                      className={`p-4 rounded-3xl text-[15px] leading-relaxed shadow-sm font-medium ${
                        msg.sender === 'user'
                          ? 'bg-rose-500 text-white rounded-tr-none shadow-rose-200'
                          : 'bg-white text-gray-700 rounded-tl-none border border-gray-100'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex items-start gap-2.5 max-w-[85%]">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center shrink-0 shadow-inner">
                    <Bot className="w-4.5 h-4.5" />
                  </div>
                  <div className="bg-white text-gray-700 p-4 rounded-3xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-1 min-w-[60px]">
                    <span className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-2 items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask CareBuddy anything..."
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 transition-all text-[15px] font-bold"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="p-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl shadow-lg shadow-rose-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
