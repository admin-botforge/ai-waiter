import React, { useState, useEffect } from 'react';
import { Mic, ShoppingBag, Utensils, CheckCircle } from 'lucide-react';
import { useVoice } from '../hooks/useVoice';
import { sendChat } from '../services/api';

const CustomerPage = () => {
  const { speak, listen, isListening } = useVoice();
  const [cart, setCart] = useState([]);
  const [lastResponse, setLastResponse] = useState("Tap to start ordering");
  const [orderStatus, setOrderStatus] = useState(null); // Stores Token after placement

  const handleInteraction = () => {
    listen(async (transcript) => {
      try {
        const data = await sendChat(transcript);
        setLastResponse(data.display_text);
        speak(data.voice_text);

        // Update cart live if AI identifies items
        if (data.items) setCart(data.items);
        
        // If order is placed, show the success state
        if (data.action === "ORDER_PLACED") {
          setOrderStatus("Placed");
        }
      } catch (err) {
        setLastResponse("Connection lost. Please try again.");
      }
    });
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Main Voice Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-10">
        <div className={`w-64 h-64 rounded-full flex items-center justify-center transition-all duration-500 shadow-inner ${isListening ? 'bg-red-100' : 'bg-white'}`}>
           <button 
            onClick={handleInteraction}
            className={`w-48 h-48 rounded-full flex items-center justify-center shadow-2xl transition-all ${isListening ? 'bg-red-500 scale-110' : 'bg-green-600 hover:bg-green-700'}`}
          >
            <Mic size={64} color="white" className={isListening ? 'animate-pulse' : ''} />
          </button>
        </div>
        <h2 className="mt-10 text-2xl font-bold text-slate-800 text-center max-w-md">
          {lastResponse}
        </h2>
      </div>

      {/* Sidebar Cart */}
      <div className="w-96 bg-white shadow-2xl p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-8 border-b pb-4">
          <ShoppingBag className="text-green-600" />
          <h3 className="text-xl font-bold">Your Order</h3>
        </div>

        <div className="flex-1 overflow-y-auto">
          {cart.map((item, i) => (
            <div key={i} className="flex justify-between items-center mb-4 p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-bold">{item.name}</p>
                <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
              </div>
              <p className="font-semibold">₹{item.price}</p>
            </div>
          ))}
        </div>

        {orderStatus && (
          <div className="bg-green-100 p-4 rounded-xl flex items-center gap-3 text-green-800 animate-bounce">
            <CheckCircle />
            <span className="font-bold">Order Confirmed!</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerPage;