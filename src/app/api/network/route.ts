import { NextRequest, NextResponse } from 'next/server'
import os from 'os'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const interfaces = os.networkInterfaces()
    const candidates: Array<{ address: string; name: string }> = []

    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name]
      if (iface) {
        for (const net of iface) {
          // Cast net to any to bypass potential Node.js version TypeScript definition mismatches
          const family = typeof (net as any).family === 'string' ? (net as any).family : String((net as any).family)
          if ((family === 'IPv4' || family === '4') && !net.internal) {
            candidates.push({
              address: net.address,
              name: name.toLowerCase()
            })
          }
        }
      }
    }

    let hostIp = '127.0.0.1'

    if (candidates.length > 0) {
      const isPrivateIp = (ip: string) => {
        const parts = ip.split('.').map(Number)
        if (parts[0] === 10) return true
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
        if (parts[0] === 192 && parts[1] === 168) return true
        return false
      }

      candidates.sort((a, b) => {
        const aPrivate = isPrivateIp(a.address)
        const bPrivate = isPrivateIp(b.address)
        const aPhysical = a.name.startsWith('en') || a.name.startsWith('wlan') || a.name.startsWith('eth')
        const bPhysical = b.name.startsWith('en') || b.name.startsWith('wlan') || b.name.startsWith('eth')
        
        if (aPrivate && aPhysical && !(bPrivate && bPhysical)) return -1
        if (!(aPrivate && aPhysical) && bPrivate && bPhysical) return 1
        
        if (aPrivate && !bPrivate) return -1
        if (!aPrivate && bPrivate) return 1
        
        if (aPhysical && !bPhysical) return -1
        if (!aPhysical && bPhysical) return 1
        
        return 0
      })

      hostIp = candidates[0].address
    }

    const port = process.env.PORT || 3000
    const host = request.headers.get('host') || `${hostIp}:${port}`
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const studentAccessUrl = `${protocol}://${host}`

    return NextResponse.json({
      hostIp,
      port: Number(port),
      studentAccessUrl,
      status: 'Ready'
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
