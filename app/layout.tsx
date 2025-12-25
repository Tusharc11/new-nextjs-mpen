import './globals.css'
import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import ClientLayout from './components/layouts/ClientLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pencil',
  description: 'ERP',
  icons: {
    icon: './icon.png',
  },
};

const RootLayout = ({
  children,
}: {
  children: React.ReactNode
}) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="./icon.png" sizes="any" />
        <link
          rel="icon"
          href="./icon.png"  
          type="image/png"
          sizes="any"
        />
        <link
          rel="apple-touch-icon"
          href="./apple-icon.png"
          type="image/png"
          sizes="any"
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ClientLayout>
            {children}
          </ClientLayout>
        </ThemeProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              backgroundColor: 'var(--toast-bg)',
              color: 'var(--toast-text)',
            },
            success: {
              style: {
                backgroundColor: 'var(--toast-bg)',
                color: 'var(--toast-text)',
              },
            },
            error: {
              style: {
                backgroundColor: 'var(--toast-bg)',
                color: 'var(--toast-text)',
              },
            },
          }}
        />
      </body>
    </html>
  )
}

export default RootLayout;
