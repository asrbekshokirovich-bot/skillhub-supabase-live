import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import logoLight from '../assets/logo-light.png';
import logoDark from '../assets/logo-dark.png';
import { Loader2 } from 'lucide-react';

const Login = ({ isDark }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('worker');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Append domain behind the scenes for Auth
      const email = `${username.trim().toLowerCase()}@skillhubapp.com`;
      
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              name: username.trim(),
              role: role
            }
          }
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'Invalid username or password.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center w-full h-full animate-fade-in" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
      <div className="card animate-slide-up hover-elevate" style={{ width: '95vw', maxWidth: '400px', padding: '1rem' }}>
        <div className="flex-col items-center justify-center gap-4 text-center mb-6">
          <img src={isDark ? logoDark : logoLight} alt="Skillhub Logo" style={{ height: '64px', width: 'auto', objectFit: 'contain' }} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Skillhub Portal</h1>
            <p className="text-secondary mt-1">{isSignUp ? 'Create your account' : 'Sign in to your account'}</p>
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
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </div>

          {isSignUp && (
            <div className="flex-col gap-1.5">
              <label className="text-sm font-bold">Account Role</label>
              <select 
                className="input w-full"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ appearance: 'auto' }}
              >
                <option value="ceo">Project Manager / CEO</option>
                <option value="worker">Worker</option>
              </select>
            </div>
          )}
          
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
            {loading ? <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto' }} /> : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>

          <div className="text-center mt-2">
            <button 
              type="button" 
              onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
              className="text-sm text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
