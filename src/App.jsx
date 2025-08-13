import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { useSearchParams, BrowserRouter } from 'react-router-dom';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

import './App.css';

const API_BASE = //import.meta.env.VITE_API_URL //|| 
"https://love2d-honeycomb-server.onrender.com";//"http://localhost:3000";//'https://cards-of-loop-honeycome-server.onrender.com';

function WalletContent() {
  const { publicKey, connected, signMessage } = useWallet();
  const [searchParams] = useSearchParams();
  const [challenges, setChallenges] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(false);
  const [walletVerified, setWalletVerified] = useState(false);
  const [sessionToken] = useState(searchParams.get('session') || 'none');

  let verified;

  console.log(sessionToken);

  // Fetch challenges from backend
  const fetchChallenges = async () => {
    try {
      const response = await fetch(`${API_BASE}/challenges`);
      const data = await response.json();
      setChallenges(data);
    } catch (err) {
      console.error('Failed to fetch challenges:', err);
    }
  };

  // Verify wallet with backend and link to Love2D session
  const verifySession = async () => {
  console.log("verify sessionon going",{pubKEy:publicKey, sess:sessionToken});
  if (!publicKey || !sessionToken) return;
  
  setLoading(true);
  try {
    const message = new TextEncoder().encode(
      `Verify wallet for game session: ${sessionToken}`
    );
    const signature = await signMessage(message);
    
    const walletAddress = publicKey.toString();
    
    const createUserRes = await fetch(`${API_BASE}/honeycomb-create-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress:walletAddress })
    });
    console.log('user?',createUserRes)
    if (!createUserRes.ok) {
      throw new Error('User creation failed');
    }

    const {message:mess} = await fetch(`${API_BASE}/honeycomb-auth-request?wallet=${encodeURIComponent(walletAddress)}`)
      .then(res => res.json());
    //const mess = messt.message;
    console.log(mess,"is message");

    const sign = await signMessage(new TextEncoder().encode(mess));
    const authConfirm = await fetch(`${API_BASE}/honeycomb-auth-confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: walletAddress,
        signature : Array.from(sign).join(',')
      })
    }).then(res => res.json());
    console.log(authConfirm, "is access token");

    const response = await fetch(`${API_BASE}/verify-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        sessionToken,
        walletAddress: walletAddress,
        accessToken: authConfirm.accessToken,
        signature: Array.from(signature).join(',')
      })
    });
    
    if (!response.ok) throw new Error('Verification failed');
    
    const data = await response.json();
    setWalletVerified(data.verified);
    if (data.verified) {
      console.log('verified');
      verified = true;
      //alert("Wallet successfully linked to your game session!");
    }
    console.log('done');
  } 
  
  catch (err) {
    console.error('Verification failed:', err);
    alert("Failed to verify session. Please try again.");
  } finally {
    setLoading(false);
  }
};

  // Update challenge progress
const updateProgress = async (challengeId, amount = 1) => {
    if (!publicKey) return;
    
    try {
      const response = await fetch(`${API_BASE}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          challengeId,
          progress: amount,
          sessionToken // Include session token for game tracking
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        setProgress(prev => ({
          ...prev,
          [challengeId]: data.progress
        }));
      }
    } catch (err) {
      console.error('Progress update failed:', err);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  console.log("starting connection");
  useEffect(() => {
    if (connected && publicKey && sessionToken) {
      console.log("Conditions met, starting verification...");
      verifySession();
    } else {
      console.log("Skipping verification - Missing:", {
        connected: connected,
        publicKey: publicKey,
        sessionToken: sessionToken
      });
    }
  }, [connected, publicKey, sessionToken]);

  if (!connected) {
    return (
      <div className="connect-section">
        <div className="logo"></div>
        <h1>Course Rep 101</h1>
        <h2>Wallet-Honeycomb Connection Portal</h2>
        {sessionToken ? (
          <>
            <p>Connect your Solana wallet to link with your game session</p>
            <p className="session-info">Session: {sessionToken}</p>
          </>
        ) : (
          <p>Connect your wallet to track in-game achievements</p>
        )}
        <WalletMultiButton className="connect-button" />
      </div>
    );
  }

  return (
    <div className="game-container">
      <header>
        <div className="header-content">
          <h1>Course Rep 101 link wallet</h1>
          <div className="wallet-info">
            <span className="wallet-address">
              {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
            </span>{sessionToken && (
  <span className="session-tag">
    {walletVerified
      ? "✅ Done, return to game"
      : loading
        ? "🕒 In Progress, still waiting for signature requests..."
        : "⚠️ Not verified"}
  </span>
)}

            <WalletMultiButton className="wallet-button" />
          </div>
        </div>
      </header>

      {/* ... rest of your component remains the same ... */}
    </div>
  );
}

// App component remains the same
function App() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="App">
            <WalletContent />
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}


export default App;
