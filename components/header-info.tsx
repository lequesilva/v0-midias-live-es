"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"

export default function HeaderInfo() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    // Atualizar a hora a cada segundo
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [])

  // Formatar a data e hora
  const formattedDate = currentTime.toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const formattedTime = currentTime.toLocaleTimeString("pt-BR")

  return (
    <Card className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-none shadow-sm">
      <CardContent className="p-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="h-10 w-10 relative mr-3">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1-YerjoZyCWeNnWeYdqYgqMOsPtkjTWG.png"
                alt="Mídias Live ES"
                fill
                className="object-contain"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg?height=40&width=40"
                }}
              />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Mídias Live ES</h2>
              <p className="text-xs text-gray-600">Sistema de Gerenciamento de Mensagens</p>
            </div>
          </div>

          <div className="flex items-center">
            <div className="text-right">
              <p className="text-xs text-gray-600 capitalize">{formattedDate}</p>
              <p className="text-sm font-medium text-gray-800">{formattedTime}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
