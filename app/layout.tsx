
// app/layout.tsx - Root layout with ToastProvider
import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui/use-toast'

export const metadata: Metadata = {
  title: 'KPI Management System',
  description: 'Performance Management and KPI Tracking System',
  icons: '/logo1.png',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}