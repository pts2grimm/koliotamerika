export type VehicleVideo = { kind: 'file' | 'embed'; src: string }
export function vehicleVideo(value: unknown): VehicleVideo | undefined {
 if (typeof value !== 'string' || value.length > 4096) return
 let url: URL
 try { url = new URL(value.trim()) } catch { return }
 if (url.protocol !== 'https:' || url.username || url.password) return
 const host = url.hostname.toLowerCase()
 if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
  const id = host === 'youtu.be' ? url.pathname.slice(1) : url.pathname.startsWith('/embed/') ? url.pathname.split('/')[2] : url.searchParams.get('v')
  if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return
  return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${id}` }
 }
 if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)) {
  const match = url.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([a-f0-9]+))?\/?$/)
  if (!match) return
  const hash = url.searchParams.get('h') || match[2]
  return { kind: 'embed', src: `https://player.vimeo.com/video/${match[1]}${hash && /^[a-f0-9]+$/.test(hash) ? `?h=${hash}` : ''}` }
 }
 // Media is fetched by the browser only after selection/play, never by our server.
 return { kind: 'file', src: url.href }
}
export function providerVideo(car: Record<string, unknown>): string | undefined {
 for (const field of ['video', 'video_url', 'videoUrl', 'video_link', 'videoLink']) {
  const values = Array.isArray(car[field]) ? car[field] : [car[field]]
  for (const value of values) { const video = vehicleVideo(value); if (video) return video.src }
 }
}
