import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const dirPath = path.join(process.cwd(), 'src/lib')
    const filePath = path.join(dirPath, 'visitor_count.json')

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }

    let count = 12480
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        const data = JSON.parse(fileContent)
        if (typeof data.count === 'number') {
          count = data.count
        }
      } catch (err) {
        console.error('Error reading visitor count file:', err)
      }
    }

    count += 1

    try {
      fs.writeFileSync(filePath, JSON.stringify({ count }, null, 2))
    } catch (err) {
      console.error('Error writing visitor count file:', err)
    }

    return NextResponse.json({ count })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
