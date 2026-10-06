import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'RSSSOSAA — Rivers State Secondary Schools Old Students Association';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: '#0f1a13',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            right: '-120px',
            width: '480px',
            height: '480px',
            borderRadius: '50%',
            background: 'rgba(26,71,42,0.35)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-160px',
            left: '-80px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'rgba(26,71,42,0.2)',
          }}
        />

        {/* Green accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: 'linear-gradient(90deg, #1a472a 0%, #2d6a45 50%, #d4af37 100%)',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '72px 88px',
            flex: 1,
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#d4af37',
              }}
            />
            <span
              style={{
                color: 'rgba(255,255,255,0.45)',
                fontSize: '15px',
                fontFamily: 'sans-serif',
                letterSpacing: '3px',
                textTransform: 'uppercase',
              }}
            >
              Official Member Portal
            </span>
          </div>

          {/* Main title */}
          <div
            style={{
              fontSize: '68px',
              fontWeight: 800,
              color: '#ffffff',
              fontFamily: 'sans-serif',
              lineHeight: 1.05,
              letterSpacing: '-1.5px',
              marginBottom: '24px',
            }}
          >
            RSSSOSAA
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '24px',
              color: 'rgba(255,255,255,0.55)',
              fontFamily: 'sans-serif',
              lineHeight: 1.5,
              maxWidth: '680px',
              marginBottom: '48px',
            }}
          >
            Rivers State Secondary Schools Old Students Association
          </div>

          {/* Divider */}
          <div
            style={{
              width: '64px',
              height: '3px',
              background: '#1a472a',
              borderRadius: '2px',
              marginBottom: '40px',
            }}
          />

          {/* CTA pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                background: '#1a472a',
                color: '#ffffff',
                fontSize: '16px',
                fontFamily: 'sans-serif',
                fontWeight: 600,
                padding: '12px 28px',
                borderRadius: '100px',
                letterSpacing: '0.2px',
              }}
            >
              Register as a Member
            </div>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '16px', fontFamily: 'sans-serif' }}>
              ·
            </span>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '15px', fontFamily: 'sans-serif' }}>
              Port Harcourt, Rivers State
            </span>
          </div>
        </div>

        {/* Bottom-right watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            right: '88px',
            color: 'rgba(255,255,255,0.12)',
            fontSize: '13px',
            fontFamily: 'sans-serif',
            letterSpacing: '1px',
          }}
        >
          rsssosaa.org
        </div>
      </div>
    ),
    { ...size }
  );
}
