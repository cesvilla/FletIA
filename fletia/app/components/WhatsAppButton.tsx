'use client';

const WA_NUMBER = '543816421849';
const WA_MESSAGE = encodeURIComponent('Hola! Necesito soporte con FletIA 👋');

export default function WhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${WA_NUMBER}?text=${WA_MESSAGE}`}
      target="_blank"
      rel="noopener noreferrer"
      title="Soporte por WhatsApp"
      onMouseEnter={e => {
        (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.06)';
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 28px rgba(37,211,102,0.6)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)';
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 20px rgba(37,211,102,0.45)';
      }}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: '#25D366',
        color: '#fff',
        borderRadius: '50px',
        padding: '12px 20px 12px 14px',
        boxShadow: '0 4px 20px rgba(37,211,102,0.45)',
        textDecoration: 'none',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 700,
        fontSize: '13px',
        letterSpacing: '0.02em',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 3C9.373 3 4 8.373 4 15c0 2.385.668 4.61 1.832 6.5L4 29l7.697-1.813A11.93 11.93 0 0016 28c6.627 0 12-5.373 12-12S22.627 3 16 3z" fill="#fff" fillOpacity=".15"/>
        <path d="M16 4.5C10.201 4.5 5.5 9.201 5.5 15c0 2.198.664 4.24 1.8 5.94l.23.35-1.17 4.27 4.39-1.15.34.2A10.47 10.47 0 0016 25.5c5.799 0 10.5-4.701 10.5-10.5S21.799 4.5 16 4.5zm5.7 14.99c-.24.67-1.4 1.29-1.92 1.35-.49.06-1.1.08-1.77-.11-.41-.12-.93-.28-1.6-.55-2.81-1.21-4.64-4.04-4.78-4.23-.14-.19-1.13-1.5-1.13-2.86 0-1.36.71-2.03 1.01-2.34.24-.25.56-.36.75-.36.19 0 .38.002.54.01.17.008.41-.065.64.49.24.57.81 1.97.88 2.12.07.14.12.31.02.5-.1.19-.14.31-.28.47-.14.16-.3.36-.42.48-.14.14-.29.29-.12.57.17.28.74 1.22 1.59 1.97 1.09.97 2.01 1.27 2.3 1.41.28.14.45.12.62-.07.17-.19.72-.84.91-1.12.19-.28.38-.23.64-.14.26.09 1.65.78 1.93.92.28.14.47.21.54.33.07.12.07.69-.17 1.36z" fill="#fff"/>
      </svg>
      Soporte
    </a>
  );
}
