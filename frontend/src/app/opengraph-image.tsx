import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export const alt = 'IlmIldizi PRO — Milliy Sertifikat va DTMga AI bilan tayyorlaning';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#07090E',
          backgroundImage:
            'radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.18) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.18) 0%, transparent 50%)',
          padding: '60px 80px',
          fontFamily: 'sans-serif',
          color: '#ffffff',
        }}
      >
        {/* Top bar: Brand & Live Badges */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(0, 122, 255, 0.35)',
                fontSize: '28px',
              }}
            >
              🌱
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-0.02em', color: '#ffffff' }}>
                Ilm<span style={{ color: '#007AFF' }}>Ildizi</span>
              </span>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: 'rgba(0, 122, 255, 0.2)',
                  color: '#60A5FA',
                  border: '1px solid rgba(0, 122, 255, 0.4)',
                }}
              >
                PRO
              </span>
            </div>
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '30px',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#FBBF24',
                fontSize: '16px',
                fontWeight: 700,
              }}
            >
              🔥 31 Kunlik Olovli Streak
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '30px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34D399',
                fontSize: '16px',
                fontWeight: 700,
              }}
            >
              🎯 2026 Rasmiy BMB Standart
            </div>
          </div>
        </div>

        {/* Center Main Hero & Score Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '20px',
            maxWidth: '1000px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 20px',
              borderRadius: '30px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              fontSize: '15px',
              fontWeight: 800,
              color: '#93C5FD',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            🎯 Intellektual Test & Milliy Sertifikat Platformasi
          </div>

          <div
            style={{
              fontSize: '52px',
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #D1D5DB 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Milliy Sertifikat va DTMga AI bilan tayyorlaning
          </div>

          {/* Result Card Highlight */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              padding: '16px 36px',
              borderRadius: '24px',
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              border: '1.5px solid rgba(59, 130, 246, 0.4)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                Namunaviy Natija:
              </span>
              <span style={{ fontSize: '32px', fontWeight: 900, color: '#60A5FA', fontFamily: 'monospace' }}>
                178.4 / 189 Ball
              </span>
            </div>

            <div style={{ width: '2px', height: '40px', backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 900,
                  color: '#10B981',
                  background: 'rgba(16, 185, 129, 0.15)',
                  padding: '6px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                A+ DARAJA
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer Details */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '20px',
            fontSize: '15px',
            color: '#9CA3AF',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span>⚡ 60s Anti-Darslik</span>
            <span>•</span>
            <span>🧠 Rasch Baholash Modeli</span>
            <span>•</span>
            <span>⚔️ 1v1 Battle Arena</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60A5FA', fontWeight: 700 }}>
            <span>ilmildizi.uz</span>
            <span>→</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
