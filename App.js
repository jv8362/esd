import React, { useState } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import LoginOverlay from './components/LoginOverlay';
import Dashboard from './components/Dashboard';
import Station1 from './station1';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  return (
    <div className="App">
      {!loggedIn && <LoginOverlay onLoginSuccess={() => setLoggedIn(true)} />}
      {loggedIn && <Navbar />}
      {loggedIn && <Dashboard />}
      {loggedIn && <Station1 />}
    </div>
  );
}

export default App;
