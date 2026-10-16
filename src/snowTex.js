import { CanvasTexture, SRGBColorSpace } from 'three'

// A white snow clump (tinted per instance): a lumpy blob with soft shaded edges.
export function snowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  g.translate(64, 64)
  g.beginPath()
  g.moveTo(0, -54)
  g.bezierCurveTo(30, -60, 52, -34, 50, -4)
  g.bezierCurveTo(54, 30, 30, 56, 0, 52)
  g.bezierCurveTo(-32, 58, -54, 32, -50, 0)
  g.bezierCurveTo(-56, -34, -30, -58, 0, -54)
  const fill = g.createRadialGradient(-12, -14, 4, 0, 0, 58)
  fill.addColorStop(0, '#ffffff')
  fill.addColorStop(0.7, '#f2f2f2')
  fill.addColorStop(1, '#d6d6d6')
  g.fillStyle = fill
  g.fill()
  g.strokeStyle = 'rgba(0,0,0,0.12)'
  g.lineWidth = 2
  g.beginPath()
  g.arc(-8, 6, 20, 0.4, 2.6)
  g.moveTo(22, -20)
  g.arc(14, -22, 9, 0, 2.4)
  g.stroke()
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
