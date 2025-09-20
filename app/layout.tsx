import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

// Importe o componente HeaderInfo
import HeaderInfo from "@/components/header-info"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Mídias Live ES - Exibição de Mensagens",
  description: "Conecte suas plataformas, gerencie mensagens e configure sua tela de exibição personalizada",
    generator: 'v0.app'
}

// Modifique a função RootLayout para incluir o HeaderInfo
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <div className="container mx-auto p-4">
            <HeaderInfo />
            {children}
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
