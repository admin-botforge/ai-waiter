import React, { useState, useEffect, useRef } from 'react';
import { Mic, User, Phone, CheckCircle, Circle, MessageSquare, Loader2, ShoppingBag } from 'lucide-react';
import { useVoice } from '../hooks/useVoice';
import { sendChat } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { decodeTable } from '../utils/tableCrypto';

const VoiceCustomerPage = () => {
  const { speak, listen, isListening } = useVoice();
  
  // Existing Logical State
  const [user, setUser] = useState({ name: '', phone: '' });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [tableId, setTableId] = useState("01");
  const [tokenNumber, setTokenNumber] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [cart, setCart] = useState([]);
  const chatEndRef = useRef(null);

  // New UI State
  const [menu, setMenu] = useState({});

  // 1. Detect Table ID & Fetch Menu
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashedTable = params.get('table');
    
    if (hashedTable) {
        // If the URL has a hash like ?table=Y2FmZV8wNQ, it decodes to "05"
        setTableId(decodeTable(hashedTable));
    } else {
        setTableId("01"); // Default
    }

    const fetchMenu = async () => {
      const { data } = await supabase.from('menu').select('*').eq('is_available', true);
      if (data) {
        const grouped = data.reduce((acc, item) => {
          if (!acc[item.category]) acc[item.category] = [];
          acc[item.category].push(item);
          return acc;
        }, {});
        setMenu(grouped);
      }
    };
    fetchMenu();
  }, []);

  // 2. Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // 3. Automatic Greeting Logic (Preserved)
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

  // 4. handleLogin (Preserved)
  const handleLogin = async () => {
    const nameRegex = /^[a-zA-Z\s]+$/;
    const phoneRegex = /^\d{10}$/;
    if (!user.name.trim() || !nameRegex.test(user.name)) {
        alert("Please enter a valid Name (letters only).");
        return;
    }
    if (!user.name.trim() || user.name.length <= 2) {
        alert("Please enter a valid Name.");
        return;
    }

    if (!phoneRegex.test(user.phone)) {
        alert("Invalid Phone Number. Please enter exactly 10 digits.");
        return;
    }
    if (user.phone.length !== 10) {
        alert("Phone number must be exactly 10 digits.");
        return;
    }
    if (!user.name || !user.phone) {
      alert("Please enter both Name and Phone number");
      return;
    }

    setIsLoggingIn(true);
    try {
      await supabase.from('users').upsert({ phone_number: user.phone, name: user.name }, { onConflict: 'phone_number' });
      await supabase.from('chat_sessions').insert([{ phone_number: user.phone, table_id: tableId, is_active: true }]);
      setTokenNumber(null);
      setIsLoggedIn(true);
    } catch (err) {
      console.error("Database Login Error:", err.message);
      alert("Failed to connect to database.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 5. handleVoiceInteraction (Preserved & Merged)
  const handleVoiceInteraction = () => {
    listen(async (transcript) => {
      if (!transcript) return;
      setChatHistory(prev => [...prev, { role: 'user', text: transcript }]);
      try {
        const response = await sendChat({
          phone_number: user.phone,
          name: user.name,
          table_id: tableId,
          user_input: transcript,
          current_cart: cart // <--- ADD THIS: Send the current checkbox selection to AI
        });
        setChatHistory(prev => [...prev, { role: 'ai', text: response.display_text }]);
        if (response.items) setCart(response.items);
        if (response.token_number) setTokenNumber(response.token_number);
        
        // Use your specific timeout logic for clear speech
        setTimeout(() => {
          speak(response.voice_text);
        }, 500);
      } catch (err) {
        console.error("API Error:", err);
      }
    });
  };

  // 6. Manual Checkbox Sync
  const handleQuantityChange = (item, qty) => {
    const itemName = item.name_en || item.name;
    setCart(prev => {
      const exists = prev.find(i => i.name === itemName);
      if (qty === 0) {
        return prev.filter(i => i.name !== itemName);
      }
      if (exists) {
        return prev.map(i => i.name === itemName ? { ...i, quantity: qty } : i);
      }
      return [...prev, { name: itemName, price: item.price, quantity: qty }];
    });
  };

  const styles = {
    wrapper: { backgroundColor: '#020617', color: '#f8fafc', minHeight: '100vh', fontFamily: '"Inter", sans-serif' },
    mainContainer: { display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '800px', margin: '0 auto', borderLeft: '1px solid #1e293b', borderRight: '1px solid #1e293b', position: 'relative' },
    // menuSection: { flex: 1, overflowY: 'auto', padding: '40px 20px', paddingBottom: '350px' },
    categoryLabel: { fontFamily: '"Playfair Display", serif', color: '#fbbf24', fontSize: '1.6rem', borderBottom: '1px solid #334155', marginBottom: '15px', marginTop: '35px', paddingBottom: '5px' },
    // itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 10px', borderBottom: '1px solid #0f172a', cursor: 'pointer' },
    // chatFixedContainer: { position: 'fixed', bottom: 0, width: '100%', maxWidth: '800px', backgroundColor: '#0f172a', borderTop: '2px solid #fbbf24', height: '320px', display: 'flex', flexDirection: 'column', boxShadow: '0 -10px 30px rgba(0,0,0,0.6)', zIndex: 100 },
    // chatBox: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' },
    // voiceButton: { position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)', width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fbbf24', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 25px rgba(251, 191, 36, 0.5)', zIndex: 110 },
    // menuSection: { flex: 1, overflowY: 'auto', padding: '20px 15px', paddingBottom: '320px' },
    // 1. Reduced Font Size for Menu
    categoryLabel: { 
      fontFamily: '"Playfair Display", serif', 
      color: '#fbbf24', 
      fontSize: '1.3rem', // Reduced from 1.6rem
      borderBottom: '1px solid #334155', 
      marginBottom: '10px', 
      marginTop: '25px', 
      paddingBottom: '3px' 
    },
    itemRow: { 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '8px 5px', 
      borderBottom: '1px solid #1e293b', 
      fontSize: '0.9rem' 
    },

    // 2. Mic Button moved to Bottom Right
    voiceButton: { 
      position: 'absolute', 
      top: '-28px', // Positioned relative to the TOP of the chat container
      right: '20px', 
      width: '56px', 
      height: '56px', 
      borderRadius: '50%', 
      backgroundColor: '#fbbf24', 
      border: 'none', 
      cursor: 'pointer', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      boxShadow: '0 4px 15px rgba(0,0,0,0.5)', 
      zIndex: 110 
    },
    
    qtyDropdown: {
      backgroundColor: '#020617',
      color: '#fbbf24',
      border: '1px solid #fbbf24',
      borderRadius: '4px',
      padding: '2px',
      fontSize: '0.8rem',
      marginLeft: '10px',
      cursor: 'pointer'
    },
    chatFixedContainer: { 
      position: 'fixed', 
      bottom: 0, 
      width: '100%', 
      maxWidth: '800px', 
      backgroundColor: '#0f172a', 
      borderTop: '2px solid #fbbf24', 
      height: '220px', // Reduced from 320px
      display: 'flex', 
      flexDirection: 'column', 
      boxShadow: '0 -10px 30px rgba(0,0,0,0.6)', 
      zIndex: 100 
    },

    menuSection: { 
      flex: 1, 
      overflowY: 'auto', 
      padding: '20px 15px', 
      paddingBottom: '240px' // Added buffer so last items aren't hidden behind chat
    },

    chatBox: { 
      flex: 1, 
      overflowY: 'auto', 
      padding: '10px 15px', // Tighter padding for a smaller space
      display: 'flex', 
      flexDirection: 'column', 
      gap: '8px' 
    }

  };

  // Login Screen (Rich UI version of your existing login)
  if (!isLoggedIn) {
    return (
      <div style={{...styles.wrapper, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'}}>
        <div style={{backgroundColor: '#0f172a', padding: '40px', borderRadius: '24px', textAlign: 'center', border: '1px solid #1e293b', width: '100%', maxWidth: '400px'}}>
          <h1 style={{fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', color: '#fbbf24', marginBottom: '10px'}}>VEG CAFE</h1>
          <p style={{color: '#94a3b8', marginBottom: '30px', fontSize: '0.9rem'}}>Table: {tableId}</p>
          <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
            <input 
              placeholder="Full Name" 
              style={{width: '92%', padding: '15px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155', color: 'white', outline: 'none'}} 
              value={user.name}
              onChange={e => setUser({...user, name: e.target.value})} 
            />
            <input 
              placeholder="Phone Number" 
              style={{width: '92%', padding: '15px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155', color: 'white', outline: 'none'}} 
              value={user.phone}
              onChange={e => setUser({...user, phone: e.target.value})} 
            />
            <button 
              style={{width: '100%', padding: '15px', borderRadius: '12px', background: '#fbbf24', color: '#020617', fontWeight: 'bold', border: 'none', cursor: 'pointer'}} 
              onClick={handleLogin}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? <Loader2 className="animate-spin" style={{margin: '0 auto'}} /> : "START DINING"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.mainContainer}>
        {/* MENU SECTION */}
        <div style={styles.menuSection}>
          <h1 style={{fontFamily: '"Playfair Display", serif', fontSize: '2rem', marginBottom: '10px'}}>The Menu</h1>
          {Object.keys(menu).map(cat => (
            <div key={cat}>
              <h2 style={styles.categoryLabel}>{cat}</h2>
              {menu[cat].map(item => {
                const itemName = item.name_en || item.name;
                const cartItem = cart.find(i => i.name === itemName);
                const isSelected = !!cartItem;

                return (
                  <div key={item.id} style={styles.itemRow}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px', flex: 1}}>
                      <div onClick={() => handleQuantityChange(item, isSelected ? 0 : 1)} style={{cursor: 'pointer'}}>
                        {isSelected ? <CheckCircle color="#fbbf24" size={18} /> : <Circle color="#334155" size={18} />}
                      </div>
                      <span style={{color: isSelected ? '#fff' : '#94a3b8'}}>{itemName}</span>
                    </div>
                    <div style={{display: 'flex', alignItems: 'center'}}>
                      <span style={{color: '#fbbf24', fontSize: '0.9rem'}}>₹{item.price}</span>
                      {/* 3. Quantity Dropdown (Max 10) */}
                      {isSelected && (
                        <select 
                          value={cartItem.quantity} 
                          onChange={(e) => handleQuantityChange(item, parseInt(e.target.value))}
                          style={styles.qtyDropdown}
                        >
                          {[...Array(11).keys()].map(n => (
                            <option key={n} value={n}>{n === 0 ? 'Remove' : n}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* FIXED CHAT CONTAINER */}
        <div style={styles.chatFixedContainer}>
          {/* Mic Button on the bottom right of the screen, not center of chat */}
          <button onClick={handleVoiceInteraction} style={styles.voiceButton}>
            <Mic color="#020617" size={24} className={isListening ? 'animate-pulse' : ''} />
          </button>
          
          <div style={styles.chatBox}>
            {chatHistory.length === 0 && (
              <p style={{textAlign: 'center', color: '#475569', marginTop: '60px', fontStyle: 'italic'}}>
                Tap the gold mic to start your order...
              </p>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} style={{display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'}}>
                <div style={{
                  maxWidth: '85%', padding: '12px 16px', borderRadius: '18px',
                  backgroundColor: msg.role === 'user' ? '#fbbf24' : '#1e293b',
                  color: msg.role === 'user' ? '#020617' : '#f8fafc',
                  fontSize: '0.95rem',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                  borderTopRightRadius: msg.role === 'user' ? '2px' : '18px',
                  borderTopLeftRadius: msg.role === 'ai' ? '2px' : '18px'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* BOTTOM SUMMARY BAR */}
          {/* <div style={{padding: '15px 25px', background: '#020617', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <ShoppingBag size={20} color="#fbbf24" />
              <span style={{fontSize: '0.9rem', color: '#94a3b8'}}>{cart.length} items selected</span>
            </div>
            <div style={{textAlign: 'right'}}>
                {tokenNumber && <span style={{color: '#22c55e', fontSize: '0.8rem', fontWeight: 'bold', marginRight: '15px'}}>TOKEN: #{tokenNumber}</span>}
                <span style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#fbbf24'}}>₹{cart.reduce((sum, i) => sum + (i.price * i.quantity), 0)}</span>
            </div>
          </div> */}
          {/* BOTTOM SUMMARY BAR */}
          <div style={{padding: '15px 25px', background: '#020617', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '8px'}}>
            
            {/* NEW: Item List Display */}
            <div style={{fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic'}}>
              {cart.length > 0 ? (
                cart.map(item => `${item.name} x ${item.quantity}`).join(", ")
              ) : "No items selected"}
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <ShoppingBag size={20} color="#fbbf24" />
                <span style={{fontSize: '0.9rem', color: '#f8fafc', fontWeight: 'bold'}}>{cart.length} items</span>
              </div>
              <div style={{textAlign: 'right'}}>
                  {tokenNumber && <span style={{color: '#22c55e', fontSize: '0.8rem', fontWeight: 'bold', marginRight: '15px'}}>TOKEN: #{tokenNumber}</span>}
                  <span style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#fbbf24'}}>₹{cart.reduce((sum, i) => sum + (i.price * i.quantity), 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceCustomerPage;