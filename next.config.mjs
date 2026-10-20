import { withPayload } from '@payloadcms/next/withPayload'
export default withPayload({
  poweredByHeader: false,
  outputFileTracingIncludes: { '/api/admin/invoices/*/pdf': ['./assets/fonts/*.ttf', './assets/invoice/*.png'], '/api/admin/bos/*/pdf': ['./assets/fonts/*.ttf', './assets/bos/seller-signature.png'] },
  devIndicators: false,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: { cpus: 2 },
  async redirects() {
    return [
      { source: '/tag/tehnotest/:path*', destination: '/tag/individualno-odobryavane/:path*', permanent: true },
      ...['/wp-content/uploads/2022/09/tehnotest.jpg', '/wp-content/uploads/2022/09/tehnotest-150x83.jpg', '/wp-content/uploads/2022/09/tehnotest-300x167.jpg', '/wp-content/uploads/2022/09/tehnotest-768x426.jpg'].map(source => ({ source, destination: '/images/legacy/wp-2809.jpg', permanent: true })),
      { source: '/wp-content/uploads/2025/09/tehnotest-za-avtomobili.webp', destination: '/images/legacy/wp-5589.webp', permanent: true },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www\\.koliotamerika\\.bg' }],
        destination: 'https://koliotamerika.bg/:path*',
        permanent: true,
      },
      ...['/sitemap_index.xml', '/wp-sitemap.xml', '/post-sitemap.xml', '/page-sitemap.xml', '/category-sitemap.xml', '/post_tag-sitemap.xml', '/author-sitemap.xml']
      .map(source => ({ source, destination: '/sitemap.xml', permanent: true })),
    ]
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Content-Security-Policy', value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'" },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ...(process.env.NEXT_PUBLIC_SERVER_URL?.startsWith('https://') ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : [])
    ] }]
  }
})
