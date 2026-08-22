'use client';

import { TriangleAlert } from 'lucide-react';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="uz">
      <body
        style={{
          margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1.5rem', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: '#e9eaeb', background: 'radial-gradient(circle at top, rgba(47,179,163,0.06), transparent 45%), #17181a',
          textAlign: 'center',
        }}
      >
        <div style={{ width: '100%', maxWidth: '30rem', background: '#202226', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 28, padding: '2.5rem 2rem', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
          <div style={{ width: 68, height: 68, margin: '0 auto 1.25rem', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(201,100,92,0.14)', border: '1px solid rgba(201,100,92,0.3)', color: '#dd8781' }}>
            <TriangleAlert size={30} />
          </div>
          <h1 style={{ fontSize: '3.25rem', margin: 0, letterSpacing: '-0.04em', fontWeight: 800, background: 'linear-gradient(135deg, #2fb3a3, #5cc4b6)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>500</h1>
          <h2 style={{ fontSize: '1.25rem', margin: '0.5rem 0 0', fontWeight: 700 }}>Serverda kutilmagan xatolik</h2>
          <p style={{ color: '#b7b9bc', fontSize: '0.9rem', lineHeight: 1.65, margin: '0.75rem 0 0' }}>
            Muammo bizning tomonimizda — siz noto&apos;g&apos;ri hech narsa qilmadingiz. Bir necha daqiqadan so&apos;ng qayta urinib ko&apos;ring.
          </p>
          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.75rem' }}>
            <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.8rem 1.4rem', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none', background: 'linear-gradient(90deg, #2fb3a3, #5cc4b6)', color: '#0d1416' }}>
              Bosh sahifaga
            </a>
            <button
              type="button"
              onClick={reset}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.8rem 1.4rem', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#e9eaeb', fontFamily: 'inherit' }}
            >
              Qayta yuklash
            </button>
          </div>
          <p style={{ fontSize: '0.7rem', color: '#8d9094', marginTop: '1.5rem' }}>Xatolik takrorlanaversa, Telegram orqali bizga xabar bering.</p>
        </div>
      </body>
    </html>
  );
}
