"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"

interface AnalyticsCard {
  id: number
  title: string
  label: string
  type: "bar" | "line" | "stat"
  data?: any[]
  value?: string
  change?: string
  changeType?: "positive" | "negative"
  description?: string
  icon?: React.ReactNode
}

const analyticsCards: AnalyticsCard[] = [
  {
    id: 1,
    title: "Transfer Receipts",
    label: "TRANSFER RECEIPTS",
    type: "bar",
    data: [
      { name: "Mon", value: 45 },
      { name: "Tue", value: 52 },
      { name: "Wed", value: 48 },
      { name: "Thu", value: 61 },
      { name: "Fri", value: 55 },
      { name: "Sat", value: 67 },
    ],
  },
  {
    id: 2,
    title: "Sales Analytics",
    label: "TOTAL SALES",
    type: "stat",
    value: "$527.8K",
    change: "+32%",
    changeType: "positive",
    description:
      "This amount of total sales highlights the effectiveness of our recent strategies and content approach.",
  },
  {
    id: 3,
    title: "Inventory Valuation",
    label: "GROWTH",
    type: "stat",
    value: "+21.35%",
    change: "last month",
    changeType: "positive",
    description:
      "This significant increase in growth highlights the effectiveness of our recent strategies and content approach.",
  },
  {
    id: 4,
    title: "Stock Movement",
    label: "ENGAGEMENT",
    type: "bar",
    data: [
      { name: "In", value: 320 },
      { name: "Out", value: 280 },
      { name: "Adjusted", value: 45 },
      { name: "Damaged", value: 12 },
    ],
  },
]

export default function AnimatedCardsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % analyticsCards.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 flex items-center justify-center p-8 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-60 h-60 bg-white/5 rounded-full blur-3xl" />

      {/* Cards Container with upward scroll animation */}
      <div className="relative w-full max-w-sm h-96">
        <div
          className="transition-transform duration-700 ease-out"
          style={{
            transform: `translateY(-${currentIndex * 100}%)`,
          }}
        >
          {analyticsCards.map((card) => (
            <div key={card.id} className="w-full h-96 flex-shrink-0">
              <div className="w-full h-full bg-white rounded-3xl shadow-2xl p-8 flex flex-col justify-between">
                {/* Card Label */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 tracking-wider mb-3">{card.label}</p>
                </div>

                {/* Card Content */}
                <div className="flex-1 flex flex-col justify-center">
                  {card.type === "bar" && card.data && (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={card.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: "12px" }} />
                          <YAxis hide />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#f1f5f9",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                            }}
                          />
                          <Bar dataKey="value" fill="#c4b5fd" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {card.type === "line" && card.data && (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={card.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: "12px" }} />
                          <YAxis hide />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#f1f5f9",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                            }}
                          />
                          <Line type="monotone" dataKey="value" stroke="#c4b5fd" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {card.type === "stat" && (
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <div className="text-5xl font-bold text-slate-900">{card.value}</div>
                        <div className="text-sm text-slate-500">{card.change}</div>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{card.description}</p>
                    </div>
                  )}
                </div>

                {/* Card Footer - Empty space for alignment */}
                <div />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Background Image Overlay */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: "url(/signin.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
    </div>
  )
}
