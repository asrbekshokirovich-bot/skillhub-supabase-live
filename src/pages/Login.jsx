import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import logoLight from '../assets/logo-light.png';
import logoDark from '../assets/logo-dark.png';
import { Loader2 } from 'lucide-react';

const Login = ({ isDark }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Append domain behind the scenes for Auth
      const email = `${username.trim().toLowerCase()}@skillhubapp.com`;
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid username or password.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center w-full h-full animate-fade-in" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
      <div className="card animate-slide-up hover-elevate" style={{ width: '400px', padding: '1rem' }}>
        <div className="flex-col items-center justify-center gap-4 text-center mb-6">
          <img src={isDark ? logoDark : logoLight} alt="Skillhub Logo" style={{ height: '64px', width: 'auto', objectFit: 'contain' }} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Skillhub Portal</h1>
            <p className="text-secondary mt-1">Sign in to your account</p>
          </div>
        </div>
        
        <form onSubmit={handleAuth} className="flex-col gap-4">
          {error && (
            <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', textAlign: 'center' }}>
              {error}
            </div>
          )}
          
          <div className="flex-col gap-1.5">
            <label className="text-sm font-bold">Username</label>
            <input 
              type="text" 
              className="input w-full" 
              placeholder="Enter your username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="flex-col gap-1.5">
            <label className="text-sm font-bold">Password</label>
            <input 
              type="password" 
              className="input w-full" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit"
            className="btn btn-primary w-full text-base font-bold mt-2" 
            style={{ padding: '0.875rem' }}
            disabled={loading}
          >
            {loading ? <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto' }} /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
