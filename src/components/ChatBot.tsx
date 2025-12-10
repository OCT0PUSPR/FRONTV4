"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { X, Minimize2, Maximize2, Bot, User } from "lucide-react"
import { useAllData } from "../../context/hooks"
import { API_CONFIG, OPENROUTER_CONFIG } from "../config/api"
import { useTranslation } from "react-i18next"

interface Message {
  id: string
  type: "user" | "bot"
  content: string
  timestamp: Date
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      content:
        "Hello! I can help you with information about your warehouse data. Ask me about products, warehouses, inventory, or any other data available in the system.",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"

  const {
    products,
    warehouses,
    quants,
    pickings,
    stockMoves,
    stockMoveLines,
    uom,
    categories,
    stockPickingTypes,
    lots,
    inventory,
    inventoryLines,
    loading,
    errors,
    refreshAllData,
  } = useAllData()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus()
    }
  }, [isOpen, isMinimized])

  const getAvailableData = () => {
    return {
      products: products.length,
      warehouses: warehouses.length,
      quants: quants.length,
      pickings: pickings.length,
      stockMoves: stockMoves.length,
      stockMoveLines: stockMoveLines.length,
      uom: uom.length,
      categories: categories.length,
      stockPickingTypes: stockPickingTypes.length,
      lots: lots.length,
      inventory: inventory.length,
      inventoryLines: inventoryLines.length,
      loading: Object.values(loading).some((l) => l),
      errors: Object.values(errors).filter((e) => e !== null).length,
    }
  }

  const getDataSummary = () => {
    const data = getAvailableData()
    return {
      summary: `Available data: ${data.products} products, ${data.warehouses} warehouses, ${data.quants} quants, ${data.pickings} pickings, ${data.stockMoves} stock moves, ${data.stockMoveLines} stock move lines, ${data.uom} units of measure, ${data.categories} categories, ${data.stockPickingTypes} stock picking types, ${data.lots} lots, ${data.inventory} inventory records, ${data.inventoryLines} inventory lines.`,
      detailed: {
        products: products
          .slice(0, 10)
          .map((p) => ({ id: p.id, name: p.name, code: p.default_code, qty: p.qty_available, price: p.list_price })),
        warehouses: warehouses.slice(0, 10).map((w) => ({ id: w.id, name: w.name, code: w.code })),
        categories: categories.slice(0, 10).map((c) => ({ id: c.id, name: c.name })),
        stockMoves: stockMoves.slice(0, 10).map((sm) => ({ id: sm.id, name: sm.name, state: sm.state })),
        inventory: inventory.slice(0, 10).map((i) => ({ id: i.id, name: i.name, state: i.state })),
      },
    }
  }

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const dataSummary = getDataSummary()
      const response = await fetchOpenRouterResponse(inputValue.trim(), dataSummary)
      const cleaned = sanitizeResponse(response)

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: cleaned,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: "Sorry, I encountered an error while processing your request. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Remove special tokens and markdown (asterisks, backticks, headings) from model output
  const sanitizeResponse = (text: string) => {
    if (!text) return ""
    let t = text
    // Remove common special tokens
    t = t.replace(/<\|[^>]*\|>/g, "")
    // Strip markdown emphasis and headings/backticks
    t = t.replace(/\*\*([^*]+)\*\*/g, "$1")
         .replace(/\*([^*]+)\*/g, "$1")
         .replace(/__([^_]+)__/g, "$1")
         .replace(/_([^_]+)_/g, "$1")
         .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
         .replace(/^\s*#+\s*/gm, "")
    // Collapse excessive whitespace
    t = t.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()
    return t
  }

  const fetchOpenRouterResponse = async (question: string, dataSummary: any) => {
    if (!API_CONFIG.OPENROUTER_API_KEY) {
      return "I'm sorry, but the OpenRouter API key is not configured. Please contact your administrator."
    }

    const systemPrompt = `You are a helpful warehouse management assistant. You can only answer questions based on the data provided to you.

IMPORTANT RULES:
1. ONLY answer questions using the data provided in the context
2. If you don't have the information, say "I don't have that information available in the current data"
3. Never make up or guess information
4. Be specific about what data you're using
5. If asked about data that's not available, be honest about it
 6. Respond in plain text only. Do NOT use markdown, asterisks, bold, italics, code blocks, or special tokens.
 7. Do NOT add meta-notes or disclaimers like "based on the provided snippet" — just answer directly or say it's not available.

Available data context:
${JSON.stringify(dataSummary, null, 2)}

Remember: Only use the data provided above. If the question asks for information not in this data, say "That information is not available."`

    const response = await fetch(`${API_CONFIG.OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_CONFIG.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        ...OPENROUTER_CONFIG.headers,
      },
      body: JSON.stringify({
        model: OPENROUTER_CONFIG.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        max_tokens: OPENROUTER_CONFIG.maxTokens,
        temperature: OPENROUTER_CONFIG.temperature,
      }),
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([
      {
        id: "1",
        type: "bot",
        content:
          "Hello! I can help you with information about your warehouse data. Ask me about products, warehouses, inventory, or any other data available in the system.",
        timestamp: new Date(),
      },
    ])
  }

  if (!isOpen) {
    return (
      <div className={`fixed bottom-6 ${isRTL ? "left-6" : "right-6"} z-50`}>
        <button
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 bg-[#1B475D] hover:bg-[#A9E0BA] text-[#F2F3EC] hover:text-[#1B475D] rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
        >
          <Bot className="w-5 h-5" />
          <div className={`absolute -top-2 ${isRTL ? "-left-2" : "-right-2"} w-3.5 h-3.5 bg-[#FAD766] rounded-full animate-pulse`}></div>
        </button>
      </div>
    )
  }

  return (
    <div
      className={`fixed bottom-5 ${isRTL ? "left-5" : "right-5"} z-50 transition-all duration-300 ${
        isMinimized ? "h-14" : "h-[480px]"
      } w-[360px]`}
    >
        <div className="bg-[#FFFFFF] dark:bg-[#1B475D] rounded-xl shadow-2xl dark:border-[#A9E0BA] flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-[#A9E0BA] dark:border-[#A9E0BA] bg-[#F2F3EC] dark:bg-[#1B475D] rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#A9E0BA] to-[#FAD766] rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-[#1B475D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-[#1B475D] dark:text-[#F2F3EC]">AI Assist</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 hover:bg-[#A9E0BA]/40 dark:hover:bg-[#A9E0BA]/20 rounded-lg transition-colors text-[#1B475D] dark:text-[#F2F3EC]"
            >
              {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-[#A9E0BA]/40 dark:hover:bg-[#A9E0BA]/20 rounded-lg transition-colors text-[#1B475D] dark:text-[#F2F3EC]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-[13px] leading-relaxed">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.type === "user"
                      ? isRTL ? "justify-start" : "justify-end" // user on visual right
                      : isRTL ? "justify-end" : "justify-start" // bot on visual left
                  }`}
                >
                  <div className="flex items-start gap-2.5 max-w-[85%]">
                    {message.type === "bot" && (
                      <div className="w-8 h-8 bg-gradient-to-br from-[#A9E0BA] to-[#FAD766] rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-[#1B475D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                          />
                        </svg>
                      </div>
                    )}
                    <div
                      className={`rounded-xl px-4 py-3 ${
                        message.type === "user"
                          ? "bg-[#F2F3EC] dark:bg-[#1B475D] text-[#1B475D] dark:text-[#F2F3EC] order-first"
                          : "bg-[#A9E0BA]/30 dark:bg-[#A9E0BA]/20 text-[#1B475D] dark:text-[#F2F3EC]"
                      }`}
                    >
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {message.type === "user" && (
                      <div className="w-8 h-8 bg-gray-300 dark:bg-[#1A3D63] rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white dark:text-gray-300" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
              <div className="flex justify-start">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#A9E0BA] to-[#FAD766] rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                        />
                      </svg>
                    </div>
                    <div className="bg-[#A9E0BA]/30 dark:bg-[#A9E0BA]/20 rounded-xl px-4 py-3">
                      <div className="flex space-x-1.5">
                        <div className="w-2 h-2 bg-[#FAD766] rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-[#FAD766] rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-[#FAD766] rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 dark:border-[#1A3D63]">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything"
                  className="flex-1 px-3.5 py-3 text-[13px] border border-gray-300 dark:border-[#1A1931] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FAD766] bg-gray-50 dark:bg-[#0A1931] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  disabled={isLoading}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <button
                  onClick={clearChat}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  Clear chat
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
