import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import './globals.css'

const inter = Roboto({ subsets:['latin'], weight:['300',"700"] })

export const metadata: Metadata = {
  title: 'Thomas Gudin - Ux Développeur et Maker ',
  description: '',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
