export function placeholderGradient(slug: string): string {
  const gradients = [
    'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    'linear-gradient(135deg, #1e1b2e 0%, #2d1b69 50%, #11998e 100%)',
    'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2d4a22 100%)',
    'linear-gradient(135deg, #1a0a0a 0%, #3d1515 50%, #6b2020 100%)',
    'linear-gradient(135deg, #0d1b2a 0%, #1b2838 50%, #2c3e50 100%)',
    'linear-gradient(135deg, #2d1f3d 0%, #1a1a2e 50%, #0d0d1a 100%)',
    'linear-gradient(135deg, #1a2a1a 0%, #0d1f0d 50%, #1f3a1f 100%)',
    'linear-gradient(135deg, #2a1a0d 0%, #3d2b1a 50%, #1a0d00 100%)',
    'linear-gradient(135deg, #0d1a2a 0%, #1a2d3d 50%, #2a3d4d 100%)',
    'linear-gradient(135deg, #1f0d2a 0%, #2d1a3d 50%, #0d001a 100%)',
  ]
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) - hash + slug.charCodeAt(i)) | 0
  }
  return gradients[Math.abs(hash) % gradients.length]
}
