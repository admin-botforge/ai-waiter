import React, { useState, useEffect, useRef } from 'react';
import { Mic, User, Phone, ShoppingCart, MessageSquare, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useVoice } from '../hooks/useVoice';
import { sendChat } from '../services/api';
import { supabase } from '../services/supabaseClient'; 

const VoiceCustomerPage = () => {
  const { speak, listen, isListening } = useVoice();
  
  // State for User Info
  const [user, setUser] = useState({ name: '', phone: '' });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [tableId, setTableId] = useState("01");
  const [tokenNumber, setTokenNumber] = useState(null);

  // State for Chat & Cart
  const [chatHistory, setChatHistory] = useState([]);
  const [cart, setCart] = useState([]);
  const chatEndRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 4;

  // 1. Detect Table ID on Load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const table = params.get('table') || "01";
    setTableId(table);
  }, []);

  // 2. Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // BUG FIX: Automatic Greeting when user enters the app
  useEffect(() => {
    if (isLoggedIn && user.name) {
      const triggerGreeting = async () => {
        try {
          const response = await sendChat({
            phone_number: user.phone,
            name: user.name,
            table_id: tableId,
            user_input: "GREET_USER_INITIAL" 
          });
          
          setChatHistory(prev => [...prev, { role: 'ai', text: response.display_text }]);
          speak(response.voice_text);
          if (response.items) setCart(response.items);
        } catch (err) {
          console.error("Greeting error:", err);
        }
      };
      triggerGreeting();
    }
  }, [isLoggedIn]);

  // FIX: Login & Session Creation
  const handleLogin = async () => {
    if (!user.name || !user.phone) {
      alert("Please enter both Name and Phone number");
      return;
    }

    setIsLoggingIn(true);
    try {
      // 1. Upsert User
      const { error: userError } = await supabase
        .from('users')
        .upsert({ phone_number: user.phone, name: user.name }, { onConflict: 'phone_number' });

      if (userError) throw userError;

      // 2. Create Chat Session
      const { error: sessionError } = await supabase
        .from('chat_sessions')
        .insert([{ 
            phone_number: user.phone, 
            table_id: tableId, 
            is_active: true 
        }]);

      if (sessionError) throw sessionError;

      // Clear old state and enter app
      setTokenNumber(null);
      setIsLoggedIn(true);
    } catch (err) {
      console.error("Database Login Error:", err.message);
      alert("Failed to connect to database. Check console.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // FIX: Mic Interaction Logic
  const handleVoiceInteraction = () => {
    listen(async (transcript) => {
      if (!transcript) return;

      setChatHistory(prev => [...prev, { role: 'user', text: transcript }]);
      
      try {
        const response = await sendChat({
          phone_number: user.phone,
          name: user.name,
          table_id: tableId,
          user_input: transcript
        });

        setChatHistory(prev => [...prev, { role: 'ai', text: response.display_text }]);
        speak(response.voice_text);
        
        if (response.items) {
          setCart(response.items);
        }
        if (response.token_number) {
          setTokenNumber(response.token_number); 
        }
        setTimeout(() => {
        speak(response.voice_text);
        }, 500);
        
      } catch (err) {
        console.error("API Error:", err);
        setChatHistory(prev => [...prev, { role: 'ai', text: "Server is not responding." }]);
      }
    });
  };
  

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 bg-green-900 flex items-center justify-center p-6 z-50">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <h2 className="text-2xl font-bold text-green-800 mb-6 text-center">Veg Cafe AI Waiter</h2>
          <p className="text-gray-500 mb-6 font-medium border-b pb-2 text-center">Table: {tableId}</p>
          <div className="space-y-4">
            <div className="flex items-center border-2 rounded-xl p-3 focus-within:border-green-500">
              <User className="text-gray-400 mr-2" />
              <input 
                placeholder="Your Name" 
                className="outline-none w-full"
                value={user.name}
                onChange={(e) => setUser({...user, name: e.target.value})}
              />
            </div>
            <div className="flex items-center border-2 rounded-xl p-3 focus-within:border-green-500">
              <Phone className="text-gray-400 mr-2" />
              <input 
                placeholder="Phone Number" 
                className="outline-none w-full"
                value={user.phone}
                onChange={(e) => setUser({...user, phone: e.target.value})}
              />
            </div>
            <button 
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition-colors flex items-center justify-center"
            >
              {isLoggingIn ? <Loader2 className="animate-spin" /> : "Start Ordering"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      {/* COLUMN 1: VISUAL MENU CARD */}
      <div className="w-1/4 bg-white border-r flex flex-col h-full hidden md:flex">
        <div className="p-6 border-b flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <ShoppingCart className="text-green-600" />
            <h2 className="text-xl font-bold">Menu Card</h2>
          </div>
        </div>

        <div className="flex-1 p-4 bg-gray-100 overflow-y-auto flex flex-col items-center justify-center relative">
          <div className="bg-white shadow-xl rounded-lg overflow-hidden transition-all duration-300 transform hover:scale-[1.02]">
            <img 
              src={`/menu/page${currentPage}.jpg`} 
              alt={`Menu Page ${currentPage}`}
              className="w-full h-auto object-contain max-h-[70vh]"
              onError={(e) => { e.target.src = 'https://via.placeholder.com/400x600?text=Menu+Page+Coming+Soon'; }}
            />
          </div>

          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className={`p-3 rounded-full bg-white/80 shadow-lg pointer-events-auto transition-all ${currentPage === 1 ? 'opacity-30' : 'hover:bg-white active:scale-95'}`}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className={`p-3 rounded-full bg-white/80 shadow-lg pointer-events-auto transition-all ${currentPage === totalPages ? 'opacity-30' : 'hover:bg-white active:scale-95'}`}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={24} />
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            {[...Array(totalPages)].map((_, i) => (
              <div key={i} className={`h-2 w-2 rounded-full transition-all ${currentPage === i + 1 ? 'bg-green-600 w-6' : 'bg-gray-300'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* COLUMN 2: CHAT HISTORY */}
      <div className="flex-1 flex flex-col bg-white shadow-inner">
        <div className="p-4 border-b bg-green-50 flex justify-between items-center">
          <span className="font-bold text-green-800">AI Waiter: Online</span>
          <span className="text-sm bg-green-200 px-3 py-1 rounded-full text-green-800 font-bold">Table {tableId}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chatHistory.length === 0 && (
            <div className="text-center text-gray-400 mt-20">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
              <p className="animate-pulse italic">Connecting to AI...</p>
            </div>
          )}
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-green-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-8 border-t bg-gray-50 flex flex-col items-center">
          <button 
            onClick={handleVoiceInteraction}
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all ${isListening ? 'bg-red-500 animate-pulse scale-110' : 'bg-green-600 hover:bg-green-700 hover:scale-105'}`}
          >
            <Mic color="white" size={32} />
          </button>
          <p className="mt-4 font-bold text-gray-500">
            {isListening ? "I'm listening..." : "Tap to Speak"}
          </p>
        </div>
      </div>

      {/* COLUMN 3: LIVE CART */}
      <div className="w-1/4 bg-white border-l p-6 hidden lg:block flex flex-col h-full">
        <h2 className="text-xl font-bold mb-6 border-b pb-4 text-green-800">Current Order</h2>
        
        <div className="flex-1 overflow-y-auto">
          {(cart || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-10 text-gray-400">
              <ShoppingCart size={40} className="mb-2 opacity-20" />
              <p className="text-center italic text-sm">Your cart is empty.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-transparent">
                  <div>
                    {/* BUG FIX: Handles name, name_en, or name_hi keys */}
                    <p className="font-bold text-sm text-gray-800">
                      {item.name || item.name_en || item.name_hi || "Unnamed Item"}
                    </p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-bold text-green-600">₹{item.price * item.quantity}</p>
                </div>
              ))}

              <div className="mt-4 pt-4 border-t border-dashed border-gray-300">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Total Amount</span>
                  <span className="text-xl font-black text-gray-900">
                    ₹{cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {tokenNumber && (
          <div className="mt-6 p-4 bg-green-50 border-2 border-green-500 border-dashed rounded-2xl text-center shadow-lg">
            <p className="text-green-800 font-bold text-xs uppercase tracking-widest">Order Confirmed</p>
            <div className="my-2 text-4xl font-black text-green-700">
              #{tokenNumber}
            </div>
            <p className="text-[10px] text-green-600 leading-tight">
              Please note this token for your pickup.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
export default VoiceCustomerPage;