import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Database connection helper with retry capability (specifically to handle Neon DB cold starts)
export async function runWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  let lastError: any = null
  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) {
        console.warn(`[Prisma] Connection retry attempt ${i + 1}/${retries}...`)
      }
      return await fn()
    } catch (err: any) {
      lastError = err
      const errorMessage = String(err.message || err)
      const errorCode = String(err.code || '')
      
      const isConnectionError = 
        errorMessage.includes("Can't reach database server") ||
        errorMessage.includes("P1001") ||
        errorCode === 'P1001' ||
        errorMessage.includes("Timed out fetching a connection") ||
        errorMessage.includes("connection limit exceeded")
      
      if (isConnectionError && i < retries - 1) {
        console.warn(`[Prisma] Connection failed: ${errorMessage.substring(0, 120)}. Retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      } else {
        throw err
      }
    }
  }
  throw lastError
}
