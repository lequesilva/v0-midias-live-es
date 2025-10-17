export async function safeFetch(url: string, options?: RequestInit): Promise<any> {
  try {
    console.log(`[safeFetch] Fazendo requisição para: ${url}`)

    const response = await fetch(url, options)
    const contentType = response.headers.get("content-type")

    console.log(`[safeFetch] Content-Type: ${contentType}`)
    console.log(`[safeFetch] Status: ${response.status}`)

    if (contentType && contentType.includes("application/json")) {
      const data = await response.json()
      console.log(`[safeFetch] Resposta JSON:`, data)

      if (!response.ok && data.error) {
        throw new Error(data.error)
      }

      return data
    } else {
      const errorText = await response.text()
      console.error(`[safeFetch] Resposta não é JSON:`, errorText)

      // Tentar extrair mensagem de erro do HTML
      const titleMatch = errorText.match(/<title>(.*?)<\/title>/)
      const errorMessage = titleMatch ? titleMatch[1] : "Erro no servidor"

      throw new Error(errorMessage)
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("fetch")) {
        throw new Error("Erro de conexão. Verifique sua internet.")
      }
      throw error
    }
    throw new Error("Erro desconhecido ao fazer requisição")
  }
}
