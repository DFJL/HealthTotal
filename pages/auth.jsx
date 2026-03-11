// pages/auth.jsx
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode]         = useState('login');   // 'login' | 'signup' | 'magic'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState(null);      // { type: 'ok'|'err', text }

  // If already logged in → redirect
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/');
    });
  }, []);

  const handle = async () => {
    setLoading(true); setMsg(null);
    try {
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        setMsg({ type: 'ok', text: '📧 Revisa tu correo — te enviamos el enlace de acceso.' });
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { name: name || email.split('@')[0] } },
        });
        if (error) throw error;
        setMsg({ type: 'ok', text: '✅ Cuenta creada. Revisa tu correo para confirmar.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/');
      }
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    }
    setLoading(false);
  };

  const TABS = [
    { id: 'login',  label: 'ENTRAR' },
    { id: 'signup', label: 'REGISTRARSE' },
    { id: 'magic',  label: 'MAGIC LINK' },
  ];

  return (
    <>
      <Head>
        <title>Felipe Health — Acceso</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#0c0c0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'JetBrains Mono', monospace" }}>
        {/* Background glow */}
        <div style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(168,255,62,.04), transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 42, fontWeight: 800, lineHeight: 1, letterSpacing: '-.02em', color: '#e8e8f0' }}>
              HEALTH<span style={{ color: '#a8ff3e' }}>.</span>
            </div>
            <div style={{ fontSize: 10, color: '#44445a', letterSpacing: '.3em', marginTop: 6, textTransform: 'uppercase' }}>
              Tu dashboard de salud personal
            </div>
          </div>

          {/* Mode tabs */}
          <div style={{ display: 'flex', background: '#131318', borderRadius: 4, marginBottom: 24, padding: 3, gap: 2 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => { setMode(t.id); setMsg(null); }} style={{
                flex: 1, padding: '9px 0', background: mode === t.id ? '#a8ff3e' : 'transparent',
                color: mode === t.id ? '#0c0c0f' : '#44445a', border: 'none', borderRadius: 3,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                letterSpacing: '.12em', cursor: 'pointer', transition: 'all .15s',
              }}>{t.label}</button>
            ))}
          </div>

          {/* Form */}
          <div style={{ background: '#131318', borderRadius: 4, padding: 28, border: '1px solid #1e1e2a' }}>
            {mode === 'signup' && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 9, color: '#44445a', letterSpacing: '.15em', display: 'block', marginBottom: 6 }}>NOMBRE</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre"
                  style={inputStyle} onKeyDown={e => e.key === 'Enter' && handle()} />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 9, color: '#44445a', letterSpacing: '.15em', display: 'block', marginBottom: 6 }}>EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com"
                style={inputStyle} onKeyDown={e => e.key === 'Enter' && handle()} />
            </div>
            {mode !== 'magic' && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 9, color: '#44445a', letterSpacing: '.15em', display: 'block', marginBottom: 6 }}>CONTRASEÑA</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  style={inputStyle} onKeyDown={e => e.key === 'Enter' && handle()} />
              </div>
            )}
            {mode === 'magic' && (
              <div style={{ marginBottom: 24, fontSize: 10, color: '#44445a', lineHeight: 1.6 }}>
                Te enviamos un enlace al correo. No necesitas contraseña.
              </div>
            )}

            <button onClick={handle} disabled={loading || !email} style={{
              width: '100%', padding: '14px 0',
              background: loading || !email ? '#1e1e2a' : '#a8ff3e',
              color: loading || !email ? '#44445a' : '#0c0c0f',
              border: 'none', borderRadius: 3, cursor: loading || !email ? 'not-allowed' : 'pointer',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
              letterSpacing: '.18em', transition: 'all .15s',
            }}>
              {loading ? 'PROCESANDO...' : mode === 'login' ? 'ENTRAR →' : mode === 'signup' ? 'CREAR CUENTA →' : 'ENVIAR ENLACE →'}
            </button>

            {msg && (
              <div style={{
                marginTop: 16, padding: '10px 14px', borderRadius: 3, fontSize: 11, lineHeight: 1.5,
                background: msg.type === 'ok' ? 'rgba(61,220,132,.08)' : 'rgba(255,77,77,.08)',
                border: `1px solid ${msg.type === 'ok' ? 'rgba(61,220,132,.2)' : 'rgba(255,77,77,.2)'}`,
                color: msg.type === 'ok' ? '#3ddc84' : '#ff4d4d',
              }}>{msg.text}</div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 9, color: '#2a2a38', letterSpacing: '.1em' }}>
            TUS DATOS SON PRIVADOS Y SOLO TUYOS
          </div>
        </div>
      </div>
    </>
  );
}

const inputStyle = {
  width: '100%', padding: '11px 14px', boxSizing: 'border-box',
  background: '#0c0c0f', border: '1px solid #2a2a38', borderRadius: 3,
  color: '#e8e8f0', fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
  outline: 'none',
};
