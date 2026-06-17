'use client'

import { useEffect, useRef, useState } from 'react'

interface Point3D {
  x: number
  y: number
  z: number
}

interface Satellite {
  angle: number
  orbitRadius: number
  speed: number
  tiltX: number
  tiltZ: number
  size: number
  name: string
}

interface CheckInNode {
  lat: number

  lng: number

  status: 'inside' | 'outside'
  name: string
  pulse: number
}

export default function ThreeDBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {


    const handleThemeChange = () => {
      const isDark = document.documentElement.classList.contains('dark')
      setTheme(isDark ? 'dark' : 'light')
    }

    handleThemeChange()


    const observer = new MutationObserver(handleThemeChange)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)



    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)



    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 }
    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = (e.clientX - width / 2) / (width / 2)
      mouse.targetY = (e.clientY - height / 2) / (height / 2)
    }
    window.addEventListener('mousemove', handleMouseMove)



    let globeRadius = 145




    const satellites: Satellite[] = [
      { name: 'GPS-01', angle: 0, orbitRadius: 240, speed: 0.006, tiltX: 0.4, tiltZ: 0.3, size: 5 },
      { name: 'GPS-02', angle: 2, orbitRadius: 260, speed: -0.005, tiltX: -0.5, tiltZ: 0.2, size: 4 },
      { name: 'GPS-03', angle: 4, orbitRadius: 250, speed: 0.004, tiltX: 0.2, tiltZ: -0.6, size: 4.5 },
      { name: 'GLONASS-01', angle: 1, orbitRadius: 275, speed: 0.003, tiltX: -0.3, tiltZ: -0.4, size: 5 }
    ]



    const checkInNodes: CheckInNode[] = [
      { name: 'Alice (CS)', lat: 0.2, lng: -0.5, status: 'inside', pulse: 0 },
      { name: 'Bob (EE)', lat: -0.4, lng: 0.8, status: 'outside', pulse: 0.5 },
      { name: 'Charlie (CS)', lat: 0.5, lng: 1.2, status: 'inside', pulse: 0.2 },
      { name: 'David (ME)', lat: -0.1, lng: -1.4, status: 'outside', pulse: 0.7 },
      { name: 'Emma (CS)', lat: 0.6, lng: -0.8, status: 'inside', pulse: 0.1 },
      { name: 'Joshua (CS)', lat: -0.3, lng: -0.2, status: 'inside', pulse: 0.4 }
    ]



    let radarAngle = 0
    const radarSpeed = 0.006



    let globeAngleY = 0
    let globeAngleX = 0
    const autoRotationSpeedY = 0.0012
    const autoRotationSpeedX = 0.0003



    const getColors = (currentTheme: 'dark' | 'light') => {
      return currentTheme === 'dark'
        ? {
          bg: '#09090b',
          globeLines: 'rgba(139, 92, 246, 0.09)',

          globeGrid: 'rgba(99, 102, 241, 0.04)',

          satellite: '#a78bfa',

          beams: 'rgba(139, 92, 246, 0.18)',
          radar: 'rgba(139, 92, 246, 0.025)',
          radarSweep: 'rgba(139, 92, 246, 0.045)',
          active: '#10b981',

          alert: '#f43f5e',

          text: 'rgba(255, 255, 255, 0.4)'
        }
        : {
          bg: '#f8fafc',
          globeLines: 'rgba(124, 58, 237, 0.07)',

          globeGrid: 'rgba(79, 70, 229, 0.03)',

          satellite: '#7c3aed',

          beams: 'rgba(124, 58, 237, 0.12)',
          radar: 'rgba(124, 58, 237, 0.015)',
          radarSweep: 'rgba(124, 58, 237, 0.03)',
          active: '#059669',

          alert: '#e11d48',

          text: 'rgba(15, 23, 42, 0.4)'
        }
    }



    const animate = () => {


      const minDim = Math.min(width, height)
      globeRadius = Math.max(140, Math.min(750, minDim * 0.42))



      const fov = globeRadius * 2.75
      const offsetZ = globeRadius * 1.38

      const colors = getColors(theme)
      ctx.fillStyle = colors.bg
      ctx.fillRect(0, 0, width, height)



      mouse.x += (mouse.targetX - mouse.x) * 0.05
      mouse.y += (mouse.targetY - mouse.y) * 0.05



      globeAngleY += autoRotationSpeedY
      globeAngleX += autoRotationSpeedX



      const rotY = globeAngleY + mouse.x * 0.4
      const rotX = globeAngleX + mouse.y * 0.4

      const cosY = Math.cos(rotY)
      const sinY = Math.sin(rotY)
      const cosX = Math.cos(rotX)
      const sinX = Math.sin(rotX)

      const centerX = width / 2
      const centerY = height / 2



      const projectPoint = (pt: Point3D, zOffset = offsetZ) => {


        const x1 = pt.x * cosY - pt.z * sinY
        const z1 = pt.z * cosY + pt.x * sinY



        const y2 = pt.y * cosX - z1 * sinX
        const z2 = z1 * cosX + pt.y * sinX

        const scale = fov / (fov + z2 + zOffset)
        return {
          x: centerX + x1 * scale,
          y: centerY + y2 * scale,
          z: z2 + zOffset,
          scale
        }
      }



      radarAngle += radarSpeed
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(radarAngle)



      const radarGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, globeRadius * 1.6)
      radarGrad.addColorStop(0, 'transparent')
      radarGrad.addColorStop(0.5, colors.radar)
      radarGrad.addColorStop(1, colors.radarSweep)

      ctx.fillStyle = radarGrad
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, globeRadius * 1.6, 0, Math.PI * 0.3)

      ctx.lineTo(0, 0)
      ctx.fill()



      ctx.strokeStyle = colors.globeLines
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.arc(0, 0, globeRadius * 1.2, 0, Math.PI * 2)
      ctx.arc(0, 0, globeRadius * 1.6, 0, Math.PI * 2)
      ctx.stroke()

      ctx.restore()



      ctx.strokeStyle = colors.globeLines



      const latGridCount = 7
      for (let i = 1; i < latGridCount; i++) {
        const phi = (i / latGridCount) * Math.PI - Math.PI / 2
        const r = globeRadius * Math.cos(phi)
        const y = globeRadius * Math.sin(phi)

        ctx.beginPath()
        const steps = 60
        for (let j = 0; j <= steps; j++) {
          const theta = (j / steps) * Math.PI * 2
          const pt3d = {
            x: r * Math.cos(theta),
            y: y,
            z: r * Math.sin(theta)
          }
          const screen = projectPoint(pt3d)
          if (j === 0) ctx.moveTo(screen.x, screen.y)
          else ctx.lineTo(screen.x, screen.y)
        }
        ctx.lineWidth = 0.5
        ctx.stroke()
      }



      const lngGridCount = 10
      for (let i = 0; i < lngGridCount; i++) {
        const theta = (i / lngGridCount) * Math.PI * 2

        ctx.beginPath()
        const steps = 60
        for (let j = 0; j <= steps; j++) {
          const phi = (j / steps) * Math.PI - Math.PI / 2
          const pt3d = {
            x: globeRadius * Math.cos(phi) * Math.cos(theta),
            y: globeRadius * Math.sin(phi),
            z: globeRadius * Math.cos(phi) * Math.sin(theta)
          }
          const screen = projectPoint(pt3d)
          if (j === 0) ctx.moveTo(screen.x, screen.y)
          else ctx.lineTo(screen.x, screen.y)
        }
        ctx.lineWidth = 0.5
        ctx.stroke()
      }



      satellites.forEach((sat) => {
        ctx.beginPath()
        const steps = 80
        for (let j = 0; j <= steps; j++) {
          const t = (j / steps) * Math.PI * 2


          const currentOrbitRadius = globeRadius * (sat.orbitRadius / 145)
          const x = currentOrbitRadius * Math.cos(t)
          const y = 0
          const z = currentOrbitRadius * Math.sin(t)



          const xTilted = x
          const yTilted = y * Math.cos(sat.tiltX) - z * Math.sin(sat.tiltX)
          const zTilted = z * Math.cos(sat.tiltX) + y * Math.sin(sat.tiltX)

          const screen = projectPoint({ x: xTilted, y: yTilted, z: zTilted })
          if (j === 0) ctx.moveTo(screen.x, screen.y)
          else ctx.lineTo(screen.x, screen.y)
        }
        ctx.strokeStyle = colors.globeGrid
        ctx.lineWidth = 0.5
        ctx.stroke()
      })



      interface Renderable {
        type: 'satellite' | 'checkin' | 'beam'
        z: number
        draw: () => void
      }
      const renderList: Renderable[] = []



      satellites.forEach((sat) => {
        sat.angle += sat.speed


        const currentOrbitRadius = globeRadius * (sat.orbitRadius / 145)
        const x = currentOrbitRadius * Math.cos(sat.angle)
        const y = 0
        const z = currentOrbitRadius * Math.sin(sat.angle)



        const xTilted = x
        const yTilted = y * Math.cos(sat.tiltX) - z * Math.sin(sat.tiltX)
        const zTilted = z * Math.cos(sat.tiltX) + y * Math.sin(sat.tiltX)

        const pos3d = { x: xTilted, y: yTilted, z: zTilted }
        const screen = projectPoint(pos3d)

        renderList.push({
          type: 'satellite',
          z: screen.z,
          draw: () => {


            ctx.strokeStyle = colors.satellite
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(screen.x - 8 * screen.scale, screen.y)
            ctx.lineTo(screen.x + 8 * screen.scale, screen.y)
            ctx.stroke()



            ctx.fillStyle = colors.bg
            ctx.fillRect(screen.x - 12 * screen.scale, screen.y - 3 * screen.scale, 4 * screen.scale, 6 * screen.scale)
            ctx.fillRect(screen.x + 8 * screen.scale, screen.y - 3 * screen.scale, 4 * screen.scale, 6 * screen.scale)
            ctx.strokeRect(screen.x - 12 * screen.scale, screen.y - 3 * screen.scale, 4 * screen.scale, 6 * screen.scale)
            ctx.strokeRect(screen.x + 8 * screen.scale, screen.y - 3 * screen.scale, 4 * screen.scale, 6 * screen.scale)



            ctx.fillStyle = colors.satellite
            ctx.shadowColor = colors.satellite
            ctx.shadowBlur = 4
            ctx.beginPath()
            ctx.arc(screen.x, screen.y, sat.size * screen.scale, 0, Math.PI * 2)
            ctx.fill()
            ctx.shadowBlur = 0




            ctx.fillStyle = colors.text
            ctx.font = `${Math.max(6, 8 * screen.scale)}px monospace`
            ctx.fillText(sat.name, screen.x + 8, screen.y - 4)
          }
        })





        const targetNodeIdx = satellites.indexOf(sat) % checkInNodes.length
        const targetNode = checkInNodes[targetNodeIdx]

        const targetX = globeRadius * Math.cos(targetNode.lat) * Math.cos(targetNode.lng)
        const targetY = globeRadius * Math.sin(targetNode.lat)
        const targetZ = globeRadius * Math.cos(targetNode.lat) * Math.sin(targetNode.lng)

        const targetScreen = projectPoint({ x: targetX, y: targetY, z: targetZ })

        renderList.push({
          type: 'beam',
          z: Math.min(screen.z, targetScreen.z),
          draw: () => {


            ctx.strokeStyle = colors.beams
            ctx.lineWidth = 0.75
            ctx.setLineDash([3, 4])
            ctx.beginPath()
            ctx.moveTo(screen.x, screen.y)
            ctx.lineTo(targetScreen.x, targetScreen.y)
            ctx.stroke()
            ctx.setLineDash([])

          }
        })
      })



      checkInNodes.forEach((node) => {


        const x = globeRadius * Math.cos(node.lat) * Math.cos(node.lng)
        const y = globeRadius * Math.sin(node.lat)
        const z = globeRadius * Math.cos(node.lat) * Math.sin(node.lng)

        const screen = projectPoint({ x, y, z })



        const isFrontSide = screen.z < offsetZ

        node.pulse += 0.008
        if (node.pulse > 1) node.pulse = 0

        renderList.push({
          type: 'checkin',
          z: screen.z,
          draw: () => {
            const color = node.status === 'inside' ? colors.active : colors.alert



            const sideOpacity = isFrontSide ? 1.0 : 0.25



            ctx.strokeStyle = color
            ctx.globalAlpha = (1 - node.pulse) * 0.4 * sideOpacity
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.arc(screen.x, screen.y, (10 + node.pulse * 25) * screen.scale, 0, Math.PI * 2)
            ctx.stroke()
            ctx.globalAlpha = 1.0




            ctx.fillStyle = color
            ctx.shadowColor = color
            ctx.shadowBlur = isFrontSide ? 8 : 0
            ctx.beginPath()
            ctx.arc(screen.x, screen.y, 3.5 * screen.scale, 0, Math.PI * 2)
            ctx.fill()
            ctx.shadowBlur = 0




            if (isFrontSide) {
              ctx.fillStyle = colors.text
              ctx.font = `bold ${Math.max(7, 9 * screen.scale)}px system-ui`
              ctx.fillText(node.name, screen.x + 6, screen.y + 3)
            }
          }
        })
      })



      renderList.sort((a, b) => b.z - a.z)
      renderList.forEach((item) => item.draw())



      const centerProj = projectPoint({ x: 0, y: 0, z: 0 })



      ctx.fillStyle = colors.satellite
      ctx.shadowColor = colors.satellite
      ctx.shadowBlur = 15
      ctx.beginPath()
      ctx.arc(centerProj.x, centerProj.y, 6.5 * centerProj.scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationFrameId)
    }
  }, [theme])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none -z-10 block transition-colors duration-300"
      style={{ mixBlendMode: 'normal' }}
    />
  )
}
