import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import VoiceCustomerPage from './pages/VoiceCustomerPage'; // Rename your current App.jsx logic to this
import KitchenDashboard from './pages/KitchenDashboard';

function App() {
  return (
    <Router>
      <Routes>
        {/* The main AI Voice Page */}
        <Route path="/" element={<VoiceCustomerPage />} />
        
        {/* The Kitchen View */}
        <Route path="/kitchen" element={<KitchenDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;