// Reuse the site's own artwork; no external image service or client-side script.
export function AdminLogo() {
 return <img
  src="/images/logo.webp"
  alt="Коли от Америка"
  width={300}
  height={69}
  style={{ display: 'block', width: 280, maxWidth: '100%', height: 'auto', margin: '0 auto', padding: 12, boxSizing: 'border-box', background: '#fff', borderRadius: 8 }}
 />
}

export function AdminIcon() {
 return <img
  src="/favicon.ico"
  alt="Коли от Америка"
  width={32}
  height={32}
  style={{ display: 'block', width: 32, height: 32, objectFit: 'contain' }}
 />
}
