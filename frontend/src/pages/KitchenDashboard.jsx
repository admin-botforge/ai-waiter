import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { CheckCircle, Clock, Lock, LogOut, RefreshCcw } from 'lucide-react';

const KitchenDashboard = () => {
  const [orders, setOrders] = useState([]);
  // FIX 1: Initialize authorization from localStorage
  const [isAuthorized, setIsAuthorized] = useState(() => {
    return localStorage.getItem('kitchen_auth') === 'true';
  });
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Authorization Check
  const handleAuth = (e) => {
    e.preventDefault();
    if (accessCode === "1234") {
      setIsAuthorized(true);
      localStorage.setItem('kitchen_auth', 'true'); // Save login state
    } else {
      alert("Invalid Kitchen Access Code");
    }
  };

  const handleLogout = () => {
    setIsAuthorized(false);
    localStorage.removeItem('kitchen_auth');
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'Pending')
      .order('created_at', { ascending: true });
    
    if (!error) setOrders(data || []);
    setLoading(false);
  };

// UPDATED: Real-time Subscription Setup
  useEffect(() => {
    if (!isAuthorized) return;

    // 1. Initial Load
    fetchOrders();

    // 2. Setup Subscription
    const channel = supabase
      .channel('kitchen_realtime')
      .on(
        'postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders' 
        }, 
        (payload) => {
          console.log("🔥 REALTIME UPDATE RECEIVED:", payload);
          // When any change happens (INSERT or UPDATE), re-fetch the list
          fetchOrders();
        }
      )
      .subscribe((status) => {
        console.log("📡 Subscription Status:", status);
      });

    return () => {
      console.log("Cleaning up subscription...");
      supabase.removeChannel(channel);
    };
  }, [isAuthorized]);

  // Styles (Existing styles kept for consistency)
  const styles = {
    container: { padding: '40px', backgroundColor: '#020617', minHeight: '100vh', color: 'white', fontFamily: 'system-ui, sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '20px', marginBottom: '30px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' },
    card: { backgroundColor: '#0f172a', borderRadius: '16px', overflow: 'hidden', border: '1px solid #1e293b' },
    cardHeader: { backgroundColor: '#ea580c', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    token: { fontSize: '1.8rem', fontWeight: '900' },
    content: { padding: '20px' },
    serveBtn: { width: 'calc(100% - 40px)', margin: '0 20px 20px 20px', padding: '15px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
    loginBox: { backgroundColor: 'white', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '400px', textAlign: 'center' }
  };

  if (!isAuthorized) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617' }}>
        <div style={styles.loginBox}>
          <Lock color="#ea580c" size={32} style={{ marginBottom: '20px' }} />
          <h2 style={{ color: '#1e293b', marginBottom: '20px' }}>Kitchen Access</h2>
          <form onSubmit={handleAuth}>
            <input 
              type="password" 
              placeholder="Code" 
              style={{ width: '100%', padding: '15px', marginBottom: '20px', borderRadius: '12px', border: '2px solid #e2e8f0', textAlign: 'center', fontSize: '1.5rem' }}
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
            />
            <button style={{ ...styles.serveBtn, width: '100%', margin: 0, backgroundColor: '#ea580c' }}>Unlock</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: 0 }}>LIVE KITCHEN {loading && "..."}</h1>
          <p style={{ color: '#64748b' }}>Orders appear here automatically</p>
        </div>
        <button onClick={handleLogout} style={{ backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Logout</button>
      </header>

      <div style={styles.grid}>
        {orders.map(order => (
          <div key={order.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.token}>#{order.token_number}</span>
              <span style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: '6px' }}>TABLE {order.table_id}</span>
            </div>
            <div style={styles.content}>
                {order.items?.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e293b' }}>
                        <span style={{ fontWeight: 'bold' }}>{item.name}</span>
                        <span>x{item.quantity}</span>
                    </div>
                ))}
            </div>
            <button 
              onClick={async () => {
                const { error } = await supabase.from('orders').update({ status: 'Served' }).eq('id', order.id);
                if (!error) fetchOrders();
              }}
              style={styles.serveBtn}
            >
              <CheckCircle size={20} /> DONE / SERVED
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KitchenDashboard;