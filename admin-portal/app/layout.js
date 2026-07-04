import './globals.css'

export const metadata = { title: 'Blkuzz Admin' }

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
