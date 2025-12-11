"use client"

import { useState } from "react"
import { Button } from "../@/components/ui/button"
import { Card } from "../@/components/ui/card"
import {
  X,
  Trash2,
  Package,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowUpDown,
  Filter,
  Plus,
  Edit,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  CalendarDays,
  Sun,
  Moon,
  ChevronDown,
} from "lucide-react"
import { useTranslation } from 'react-i18next'
import { useTheme } from "../context/theme"

// Mock data for warehouses
const warehouses = [
  { id: "1", name: "Warehouse 1" },
  { id: "2", name: "Warehouse 2" },
  { id: "3", name: "Warehouse 3" },
  { id: "4", name: "Warehouse 4" },
]

// Mock data for rack cells (Z-axis) - 2 columns x 8 rows = 16 cells per rack
const rackCellsData: Record<string, Array<{ id: string; item: string; quantity: number }>> = {
  A2: [
    { id: "A2-1", item: "Onions", quantity: 203 },
    { id: "A2-2", item: "Onions", quantity: 112 },
    { id: "A2-3", item: "", quantity: 0 },
    { id: "A2-4", item: "Garlic", quantity: 170 },
    { id: "A2-5", item: "Garlic", quantity: 211 },
    { id: "A2-6", item: "", quantity: 0 },
  ],
  A5: [
    { id: "A5-1", item: "Apple", quantity: 123 },
    { id: "A5-2", item: "Apple", quantity: 91 },
    { id: "A5-3", item: "Orange", quantity: 222 },
    { id: "A5-4", item: "Orange", quantity: 323 },
    { id: "A5-5", item: "", quantity: 0 },
    { id: "A5-6", item: "", quantity: 0 },
  ],
  A6: [
    { id: "A6-1", item: "Carrot", quantity: 141 },
    { id: "A6-2", item: "Carrot", quantity: 205 },
    { id: "A6-3", item: "Carrot", quantity: 122 },
    { id: "A6-4", item: "Carrot", quantity: 130 },
    { id: "A6-5", item: "", quantity: 0 },
    { id: "A6-6", item: "", quantity: 0 },
  ],
  A7: [
    { id: "A7-1", item: "Lettuce", quantity: 123 },
    { id: "A7-2", item: "Lettuce", quantity: 142 },
    { id: "A7-3", item: "", quantity: 0 },
    { id: "A7-4", item: "", quantity: 0 },
    { id: "A7-5", item: "", quantity: 0 },
    { id: "A7-6", item: "", quantity: 0 },
  ],
  A12: [
    { id: "A12-1", item: "Spinach", quantity: 2800 },
    { id: "A12-2", item: "Spinach", quantity: 744 },
    { id: "A12-3", item: "", quantity: 0 },
    { id: "A12-4", item: "", quantity: 0 },
    { id: "A12-5", item: "", quantity: 0 },
    { id: "A12-6", item: "", quantity: 0 },
  ],
  B1: [
    { id: "B1-1", item: "Microwave", quantity: 410 },
    { id: "B1-2", item: "Microwave", quantity: 400 },
    { id: "B1-3", item: "", quantity: 0 },
    { id: "B1-4", item: "", quantity: 0 },
    { id: "B1-5", item: "", quantity: 0 },
    { id: "B1-6", item: "", quantity: 0 },
  ],
  B3: [
    { id: "B3-1", item: "Pennywort", quantity: 1301 },
    { id: "B3-2", item: "Pennywort", quantity: 131 },
    { id: "B3-3", item: "Basil", quantity: 9 },
    { id: "B3-4", item: "Basil", quantity: 9 },
    { id: "B3-5", item: "", quantity: 0 },
    { id: "B3-6", item: "", quantity: 0 },
  ],
  B6: [
    { id: "B6-1", item: "Blender", quantity: 600 },
    { id: "B6-2", item: "Blender", quantity: 2400 },
    { id: "B6-3", item: "", quantity: 0 },
    { id: "B6-4", item: "", quantity: 0 },
    { id: "B6-5", item: "", quantity: 0 },
    { id: "B6-6", item: "", quantity: 0 },
  ],
  B7: [
    { id: "B7-1", item: "Toaster", quantity: 2033 },
    { id: "B7-2", item: "Toaster", quantity: 1222 },
    { id: "B7-3", item: "", quantity: 0 },
    { id: "B7-4", item: "", quantity: 0 },
    { id: "B7-5", item: "", quantity: 0 },
    { id: "B7-6", item: "", quantity: 0 },
  ],
  B8: [
    { id: "B8-1", item: "Coffee Maker", quantity: 300 },
    { id: "B8-2", item: "Coffee Maker", quantity: 562 },
    { id: "B8-3", item: "", quantity: 0 },
    { id: "B8-4", item: "", quantity: 0 },
    { id: "B8-5", item: "", quantity: 0 },
    { id: "B8-6", item: "", quantity: 0 },
  ],
  B9: [
    { id: "B9-1", item: "Air Fryer", quantity: 1120 },
    { id: "B9-2", item: "Air Fryer", quantity: 1133 },
    { id: "B9-3", item: "", quantity: 0 },
    { id: "B9-4", item: "", quantity: 0 },
    { id: "B9-5", item: "", quantity: 0 },
    { id: "B9-6", item: "", quantity: 0 },
  ],
  B12: [
    { id: "B12-1", item: "Rice Cooker", quantity: 302 },
    { id: "B12-2", item: "Rice Cooker", quantity: 722 },
    { id: "B12-3", item: "", quantity: 0 },
    { id: "B12-4", item: "", quantity: 0 },
    { id: "B12-5", item: "", quantity: 0 },
    { id: "B12-6", item: "", quantity: 0 },
  ],
  C2: [
    { id: "C2-1", item: "Bell Pepper", quantity: 1123 },
    { id: "C2-2", item: "Bell Pepper", quantity: 1100 },
    { id: "C2-3", item: "Tomatoes", quantity: 718 },
    { id: "C2-4", item: "Tomatoes", quantity: 78 },
    { id: "C2-5", item: "", quantity: 0 },
    { id: "C2-6", item: "", quantity: 0 },
  ],
  C3: [
    { id: "C3-1", item: "Vase", quantity: 440 },
    { id: "C3-2", item: "Vase", quantity: 460 },
    { id: "C3-3", item: "", quantity: 0 },
    { id: "C3-4", item: "", quantity: 0 },
    { id: "C3-5", item: "", quantity: 0 },
    { id: "C3-6", item: "", quantity: 0 },
  ],
  C4: [
    { id: "C4-1", item: "Candle Set", quantity: 1322 },
    { id: "C4-2", item: "Candle Set", quantity: 122 },
    { id: "C4-3", item: "", quantity: 0 },
    { id: "C4-4", item: "", quantity: 0 },
    { id: "C4-5", item: "", quantity: 0 },
    { id: "C4-6", item: "", quantity: 0 },
  ],
  C5: [
    { id: "C5-1", item: "Picture Frame", quantity: 200 },
    { id: "C5-2", item: "Picture Frame", quantity: 2600 },
    { id: "C5-3", item: "", quantity: 0 },
    { id: "C5-4", item: "", quantity: 0 },
    { id: "C5-5", item: "", quantity: 0 },
    { id: "C5-6", item: "", quantity: 0 },
  ],
  C6: [
    { id: "C6-1", item: "Throw Pillow", quantity: 1228 },
    { id: "C6-2", item: "Throw Pillow", quantity: 1027 },
    { id: "C6-3", item: "", quantity: 0 },
    { id: "C6-4", item: "", quantity: 0 },
    { id: "C6-5", item: "", quantity: 0 },
    { id: "C6-6", item: "", quantity: 0 },
  ],
  C7: [
    { id: "C7-1", item: "Wall Art", quantity: 600 },
    { id: "C7-2", item: "Wall Art", quantity: 2500 },
    { id: "C7-3", item: "", quantity: 0 },
    { id: "C7-4", item: "", quantity: 0 },
    { id: "C7-5", item: "", quantity: 0 },
    { id: "C7-6", item: "", quantity: 0 },
  ],
  C10: [
    { id: "C10-1", item: "Table Lamp", quantity: 1023 },
    { id: "C10-2", item: "Table Lamp", quantity: 900 },
    { id: "C10-3", item: "", quantity: 0 },
    { id: "C10-4", item: "", quantity: 0 },
    { id: "C10-5", item: "", quantity: 0 },
    { id: "C10-6", item: "", quantity: 0 },
  ],
  C11: [
    { id: "C11-1", item: "Rug", quantity: 300 },
    { id: "C11-2", item: "Rug", quantity: 3120 },
    { id: "C11-3", item: "", quantity: 0 },
    { id: "C11-4", item: "", quantity: 0 },
    { id: "C11-5", item: "", quantity: 0 },
    { id: "C11-6", item: "", quantity: 0 },
  ],
  C12: [
    { id: "C12-1", item: "Mirror", quantity: 500 },
    { id: "C12-2", item: "Mirror", quantity: 440 },
    { id: "C12-3", item: "", quantity: 0 },
    { id: "C12-4", item: "", quantity: 0 },
    { id: "C12-5", item: "", quantity: 0 },
    { id: "C12-6", item: "", quantity: 0 },
  ],
  D1: [
    { id: "D1-1", item: "Avocado", quantity: 329 },
    { id: "D1-2", item: "Avocado", quantity: 390 },
    { id: "D1-3", item: "Cucumber", quantity: 1223 },
    { id: "D1-4", item: "Cucumber", quantity: 1022 },
    { id: "D1-5", item: "", quantity: 0 },
    { id: "D1-6", item: "", quantity: 0 },
  ],
  D3: [
    { id: "D3-1", item: "Basketball", quantity: 290 },
    { id: "D3-2", item: "Basketball", quantity: 592 },
    { id: "D3-3", item: "", quantity: 0 },
    { id: "D3-4", item: "", quantity: 0 },
    { id: "D3-5", item: "", quantity: 0 },
    { id: "D3-6", item: "", quantity: 0 },
  ],
  D4: [
    { id: "D4-1", item: "Tennis Racket", quantity: 1029 },
    { id: "D4-2", item: "Tennis Racket", quantity: 1802 },
    { id: "D4-3", item: "", quantity: 0 },
    { id: "D4-4", item: "", quantity: 0 },
    { id: "D4-5", item: "", quantity: 0 },
    { id: "D4-6", item: "", quantity: 0 },
  ],
  D5: [
    { id: "D5-1", item: "Yoga Mat", quantity: 330 },
    { id: "D5-2", item: "Yoga Mat", quantity: 330 },
    { id: "D5-3", item: "", quantity: 0 },
    { id: "D5-4", item: "", quantity: 0 },
    { id: "D5-5", item: "", quantity: 0 },
    { id: "D5-6", item: "", quantity: 0 },
  ],
  D6: [
    { id: "D6-1", item: "Dumbbells", quantity: 1094 },
    { id: "D6-2", item: "Dumbbells", quantity: 1222 },
    { id: "D6-3", item: "", quantity: 0 },
    { id: "D6-4", item: "", quantity: 0 },
    { id: "D6-5", item: "", quantity: 0 },
    { id: "D6-6", item: "", quantity: 0 },
  ],
  D7: [
    { id: "D7-1", item: "Soccer Ball", quantity: 535 },
    { id: "D7-2", item: "Soccer Ball", quantity: 935 },
    { id: "D7-3", item: "", quantity: 0 },
    { id: "D7-4", item: "", quantity: 0 },
    { id: "D7-5", item: "", quantity: 0 },
    { id: "D7-6", item: "", quantity: 0 },
  ],
  D10: [
    { id: "D10-1", item: "Running Shoes", quantity: 2038 },
    { id: "D10-2", item: "Running Shoes", quantity: 170 },
    { id: "D10-3", item: "", quantity: 0 },
    { id: "D10-4", item: "", quantity: 0 },
    { id: "D10-5", item: "", quantity: 0 },
    { id: "D10-6", item: "", quantity: 0 },
  ],
  D11: [
    { id: "D11-1", item: "Resistance Bands", quantity: 1022 },
    { id: "D11-2", item: "Resistance Bands", quantity: 329 },
    { id: "D11-3", item: "", quantity: 0 },
    { id: "D11-4", item: "", quantity: 0 },
    { id: "D11-5", item: "", quantity: 0 },
    { id: "D11-6", item: "", quantity: 0 },
  ],
}

const warehouseData = {
  "1": {
    sectionGroups: [
      {
        id: "A",
        name: "A-Electronics",
        usage: "5/12",
        sections: [
          { id: "A1", occupied: false },
          { id: "A2", occupied: true, color: "green" },
          { id: "A3", occupied: false },
          { id: "A4", occupied: false },
          { id: "A5", occupied: true, color: "green" },
          { id: "A6", occupied: true, color: "green" },
          { id: "A7", occupied: true, color: "green" },
          { id: "A8", occupied: false },
          { id: "A9", occupied: false },
          { id: "A10", occupied: false },
          { id: "A11", occupied: false },
          { id: "A12", occupied: true, color: "green" },
        ],
      },
      {
        id: "B",
        name: "B-Appliances",
        usage: "7/12",
        sections: [
          { id: "B1", occupied: true, color: "yellow" },
          { id: "B2", occupied: false },
          { id: "B3", occupied: true, color: "yellow" },
          { id: "B4", occupied: false },
          { id: "B5", occupied: false },
          { id: "B6", occupied: true, color: "yellow" },
          { id: "B7", occupied: true, color: "yellow" },
          { id: "B8", occupied: true, color: "yellow" },
          { id: "B9", occupied: true, color: "yellow" },
          { id: "B10", occupied: false },
          { id: "B11", occupied: false },
          { id: "B12", occupied: true, color: "yellow" },
        ],
      },
      {
        id: "C",
        name: "C-Home Decor",
        usage: "8/12",
        sections: [
          { id: "C1", occupied: false },
          { id: "C2", occupied: true, color: "purple" },
          { id: "C3", occupied: true, color: "purple" },
          { id: "C4", occupied: true, color: "purple" },
          { id: "C5", occupied: true, color: "purple" },
          { id: "C6", occupied: true, color: "purple" },
          { id: "C7", occupied: true, color: "purple" },
          { id: "C8", occupied: false },
          { id: "C9", occupied: false },
          { id: "C10", occupied: true, color: "purple" },
          { id: "C11", occupied: true, color: "purple" },
          { id: "C12", occupied: true, color: "purple" },
        ],
      },
      {
        id: "D",
        name: "D-Sports",
        usage: "7/12",
        sections: [
          { id: "D1", occupied: true, color: "teal" },
          { id: "D2", occupied: false },
          { id: "D3", occupied: true, color: "teal" },
          { id: "D4", occupied: true, color: "teal" },
          { id: "D5", occupied: true, color: "teal" },
          { id: "D6", occupied: true, color: "teal" },
          { id: "D7", occupied: true, color: "teal" },
          { id: "D8", occupied: false },
          { id: "D9", occupied: false },
          { id: "D10", occupied: true, color: "teal" },
          { id: "D11", occupied: true, color: "teal" },
          { id: "D12", occupied: false },
        ],
      },
    ],
    products: {
      A2: [
        {
          id: "1",
          name: "Onions",
          code: "E5",
          stock: 101,
          total: 185,
          price: 14.81,
          image: "/pile-of-onions.png",
          status: "in-stock",
        },
        {
          id: "2",
          name: "Garlic",
          code: "E6",
          stock: 45,
          total: 120,
          price: 8.99,
          image: "/bunch-of-garlic.png",
          status: "low-stock",
        },
      ],
      A5: [
        {
          id: "13",
          name: "Apple",
          code: "C1",
          stock: 72,
          total: 877,
          price: 14.81,
          image: "/ripe-red-apple.png",
          status: "in-stock",
        },
        {
          id: "14",
          name: "Orange",
          code: "C2",
          stock: 45,
          total: 200,
          price: 9.99,
          image: "/vibrant-orange.png",
          status: "in-stock",
        },
      ],
      A6: [
        {
          id: "15",
          name: "Carrot",
          code: "A6",
          stock: 120,
          total: 150,
          price: 6.5,
          image: "/carrots.webp",
          status: "in-stock",
        },
      ],
      A7: [
        {
          id: "16",
          name: "Lettuce",
          code: "A7",
          stock: 30,
          total: 100,
          price: 5.99,
          image: "/lettuce.jpg",
          status: "in-stock",
        },
      ],
      A12: [
        {
          id: "17",
          name: "Spinach",
          code: "A12",
          stock: 15,
          total: 80,
          price: 7.5,
          image: "/fresh-spinach.png",
          status: "low-stock",
        },
      ],
      B1: [
        {
          id: "18",
          name: "Microwave",
          code: "B1",
          stock: 8,
          total: 20,
          price: 299.99,
          image: "/microwave-oven.png",
          status: "in-stock",
        },
      ],
      B3: [
        {
          id: "7",
          name: "Pennywort",
          code: "B3",
          stock: 22,
          total: 35,
          price: 12.23,
          image: "/pennywort-herbs.jpg",
          status: "in-stock",
        },
        {
          id: "8",
          name: "Basil",
          code: "B4",
          stock: 18,
          total: 40,
          price: 9.5,
          image: "/fresh-basil.png",
          status: "in-stock",
        },
      ],
      B6: [
        {
          id: "19",
          name: "Blender",
          code: "B6",
          stock: 12,
          total: 25,
          price: 89.99,
          image: "/kitchen-blender.png",
          status: "in-stock",
        },
      ],
      B7: [
        {
          id: "20",
          name: "Toaster",
          code: "B7",
          stock: 18,
          total: 30,
          price: 45.99,
          image: "/electric-toaster.png",
          status: "in-stock",
        },
      ],
      B8: [
        {
          id: "21",
          name: "Coffee Maker",
          code: "B8",
          stock: 5,
          total: 15,
          price: 129.99,
          image: "/coffee-maker.png",
          status: "low-stock",
        },
      ],
      B9: [
        {
          id: "22",
          name: "Air Fryer",
          code: "B9",
          stock: 22,
          total: 35,
          price: 159.99,
          image: "/air-fryer.png",
          status: "in-stock",
        },
      ],
      B12: [
        {
          id: "23",
          name: "Rice Cooker",
          code: "B12",
          stock: 14,
          total: 20,
          price: 79.99,
          image: "/rice-cooker.png",
          status: "in-stock",
        },
      ],
      C2: [
        {
          id: "3",
          name: "Bell Pepper",
          code: "A1",
          stock: 22,
          total: 994,
          price: 8.99,
          image: "/single-bell-pepper.png",
          status: "in-stock",
        },
        {
          id: "4",
          name: "Tomatoes",
          code: "A2",
          stock: 156,
          total: 300,
          price: 12.5,
          image: "/ripe-tomatoes.png",
          status: "in-stock",
        },
      ],
      C3: [
        {
          id: "24",
          name: "Vase",
          code: "C3",
          stock: 8,
          total: 20,
          price: 34.99,
          image: "/decorative-vase.png",
          status: "in-stock",
        },
      ],
      C4: [
        {
          id: "25",
          name: "Candle Set",
          code: "C4",
          stock: 25,
          total: 50,
          price: 19.99,
          image: "/candle-set.png",
          status: "in-stock",
        },
      ],
      C5: [
        {
          id: "26",
          name: "Picture Frame",
          code: "C5",
          stock: 40,
          total: 60,
          price: 24.99,
          image: "/picture-frame.png",
          status: "in-stock",
        },
      ],
      C6: [
        {
          id: "27",
          name: "Throw Pillow",
          code: "C6",
          stock: 55,
          total: 80,
          price: 29.99,
          image: "/throw-pillow.png",
          status: "in-stock",
        },
      ],
      C7: [
        {
          id: "28",
          name: "Wall Art",
          code: "C7",
          stock: 12,
          total: 25,
          price: 89.99,
          image: "/wall-art.png",
          status: "in-stock",
        },
      ],
      C10: [
        {
          id: "29",
          name: "Table Lamp",
          code: "C10",
          stock: 18,
          total: 30,
          price: 54.99,
          image: "/table-lamp.png",
          status: "in-stock",
        },
      ],
      C11: [
        {
          id: "30",
          name: "Rug",
          code: "C11",
          stock: 6,
          total: 15,
          price: 149.99,
          image: "/area-rug.png",
          status: "low-stock",
        },
      ],
      C12: [
        {
          id: "31",
          name: "Mirror",
          code: "C12",
          stock: 9,
          total: 20,
          price: 79.99,
          image: "/wall-mirror.png",
          status: "in-stock",
        },
      ],
      D1: [
        {
          id: "9",
          name: "Avocado",
          code: "D1",
          stock: 78,
          total: 540,
          price: 14.81,
          image: "/ripe-avocado-halves.png",
          status: "updated",
        },
        {
          id: "10",
          name: "Cucumber",
          code: "E7",
          stock: 5,
          total: 877,
          price: 14.81,
          image: "/single-fresh-cucumber.png",
          status: "out-of-stock",
        },
      ],
      D3: [
        {
          id: "32",
          name: "Basketball",
          code: "D3",
          stock: 45,
          total: 100,
          price: 29.99,
          image: "/basketball.png",
          status: "in-stock",
        },
      ],
      D4: [
        {
          id: "33",
          name: "Tennis Racket",
          code: "D4",
          stock: 15,
          total: 30,
          price: 89.99,
          image: "/tennis-racket.png",
          status: "in-stock",
        },
      ],
      D5: [
        {
          id: "34",
          name: "Yoga Mat",
          code: "D5",
          stock: 60,
          total: 80,
          price: 34.99,
          image: "/yoga-mat.png",
          status: "in-stock",
        },
      ],
      D6: [
        {
          id: "35",
          name: "Dumbbells",
          code: "D6",
          stock: 28,
          total: 50,
          price: 49.99,
          image: "/dumbbells.png",
          status: "in-stock",
        },
      ],
      D7: [
        {
          id: "36",
          name: "Soccer Ball",
          code: "D7",
          stock: 70,
          total: 100,
          price: 24.99,
          image: "/soccer-ball.png",
          status: "in-stock",
        },
      ],
      D10: [
        {
          id: "37",
          name: "Running Shoes",
          code: "D10",
          stock: 35,
          total: 60,
          price: 119.99,
          image: "/running-shoes.png",
          status: "in-stock",
        },
      ],
      D11: [
        {
          id: "38",
          name: "Resistance Bands",
          code: "D11",
          stock: 42,
          total: 70,
          price: 19.99,
          image: "/resistance-bands.png",
          status: "in-stock",
        },
      ],
    },
  },
  "2": {
    sectionGroups: [
      {
        id: "A",
        name: "A-Furniture",
        usage: "6/12",
        sections: [
          { id: "A1", occupied: true, color: "green" },
          { id: "A2", occupied: false },
          { id: "A3", occupied: true, color: "green" },
          { id: "A4", occupied: true, color: "green" },
          { id: "A5", occupied: false },
          { id: "A6", occupied: true, color: "green" },
          { id: "A7", occupied: false },
          { id: "A8", occupied: true, color: "green" },
          { id: "A9", occupied: false },
          { id: "A10", occupied: true, color: "green" },
          { id: "A11", occupied: false },
          { id: "A12", occupied: false },
        ],
      },
      {
        id: "B",
        name: "B-Tools",
        usage: "8/12",
        sections: [
          { id: "B1", occupied: true, color: "yellow" },
          { id: "B2", occupied: true, color: "yellow" },
          { id: "B3", occupied: false },
          { id: "B4", occupied: true, color: "yellow" },
          { id: "B5", occupied: true, color: "yellow" },
          { id: "B6", occupied: true, color: "yellow" },
          { id: "B7", occupied: false },
          { id: "B8", occupied: true, color: "yellow" },
          { id: "B9", occupied: true, color: "yellow" },
          { id: "B10", occupied: false },
          { id: "B11", occupied: true, color: "yellow" },
          { id: "B12", occupied: false },
        ],
      },
    ],
    products: {
      A1: [
        {
          id: "11",
          name: "Banana",
          code: "A3",
          stock: 79,
          total: 561,
          price: 17.84,
          image: "/ripe-banana.png",
          status: "in-stock",
        },
      ],
      A3: [
        {
          id: "39",
          name: "Dining Table",
          code: "A3",
          stock: 4,
          total: 10,
          price: 599.99,
          image: "/dining-table.png",
          status: "low-stock",
        },
      ],
      A4: [
        {
          id: "40",
          name: "Office Chair",
          code: "A4",
          stock: 12,
          total: 20,
          price: 249.99,
          image: "/office-chair.png",
          status: "in-stock",
        },
      ],
      A6: [
        {
          id: "41",
          name: "Bookshelf",
          code: "A6",
          stock: 8,
          total: 15,
          price: 179.99,
          image: "/bookshelf.png",
          status: "in-stock",
        },
      ],
      A8: [
        {
          id: "42",
          name: "Sofa",
          code: "A8",
          stock: 3,
          total: 8,
          price: 899.99,
          image: "/modern-sofa.png",
          status: "in-stock",
        },
      ],
      A10: [
        {
          id: "43",
          name: "Coffee Table",
          code: "A10",
          stock: 15,
          total: 25,
          price: 199.99,
          image: "/coffee-table.png",
          status: "in-stock",
        },
      ],
      B1: [
        {
          id: "44",
          name: "Drill Set",
          code: "B1",
          stock: 18,
          total: 30,
          price: 129.99,
          image: "/drill-set.png",
          status: "in-stock",
        },
      ],
      B2: [
        {
          id: "45",
          name: "Hammer",
          code: "B2",
          stock: 45,
          total: 60,
          price: 24.99,
          image: "/hammer.png",
          status: "in-stock",
        },
      ],
      B4: [
        {
          id: "46",
          name: "Screwdriver Set",
          code: "B4",
          stock: 32,
          total: 50,
          price: 39.99,
          image: "/screwdriver-set.png",
          status: "in-stock",
        },
      ],
      B5: [
        {
          id: "47",
          name: "Wrench Set",
          code: "B5",
          stock: 22,
          total: 40,
          price: 54.99,
          image: "/wrench-set.png",
          status: "in-stock",
        },
      ],
      B6: [
        {
          id: "48",
          name: "Saw",
          code: "B6",
          stock: 14,
          total: 25,
          price: 44.99,
          image: "/hand-saw.png",
          status: "in-stock",
        },
      ],
      B8: [
        {
          id: "49",
          name: "Pliers",
          code: "B8",
          stock: 38,
          total: 50,
          price: 19.99,
          image: "/pliers.png",
          status: "in-stock",
        },
      ],
      B9: [
        {
          id: "50",
          name: "Tape Measure",
          code: "B9",
          stock: 50,
          total: 70,
          price: 14.99,
          image: "/tape-measure.png",
          status: "in-stock",
        },
      ],
      B11: [
        {
          id: "51",
          name: "Level",
          code: "B11",
          stock: 28,
          total: 40,
          price: 29.99,
          image: "/spirit-level.png",
          status: "in-stock",
        },
      ],
    },
  },
}

type Product = {
  id: string
  name: string
  code: string
  stock: number
  total: number
  price: number
  image: string
  status: string
}

const RACK_MAX_CAPACITY = 4200

const itemImages: Record<string, string> = {
  Onions: "/pile-of-onions.png",
  Garlic: "/bunch-of-garlic.png",
  Apple: "/ripe-red-apple.png",
  Orange: "/vibrant-orange.png",
  Carrot: "/carrots.webp",
  Lettuce: "/lettuce.jpg",
  Spinach: "/fresh-spinach.png",
  Microwave: "/microwave-oven.png",
  Pennywort: "/pennywort-herbs.jpg",
  Basil: "/fresh-basil.png",
  Blender: "/kitchen-blender.png",
  Toaster: "/electric-toaster.png",
  "Coffee Maker": "/coffee-maker.png",
  "Air Fryer": "/air-fryer.png",
  "Rice Cooker": "/rice-cooker.png",
  "Bell Pepper": "/single-bell-pepper.png",
  Tomatoes: "/ripe-tomatoes.png",
  Vase: "/decorative-vase.png",
  "Candle Set": "/candle-set.png",
  "Picture Frame": "/picture-frame.png",
  "Throw Pillow": "/throw-pillow.png",
  "Wall Art": "/wall-art.png",
  "Table Lamp": "/table-lamp.png",
  Rug: "/area-rug.png",
  Mirror: "/wall-mirror.png",
  Avocado: "/ripe-avocado-halves.png",
  Cucumber: "/single-fresh-cucumber.png",
  Basketball: "/basketball.png",
  "Tennis Racket": "/tennis-racket.png",
  "Yoga Mat": "/yoga-mat.png",
  Dumbbells: "/dumbbells.png",
  "Soccer Ball": "/soccer-ball.png",
  "Running Shoes": "/running-shoes.png",
  "Resistance Bands": "/resistance-bands.png",
}

export default function WarehouseView() {
  // Renamed from WarehouseManager to WarehouseView
  const [selectedWarehouse, setSelectedWarehouse] = useState("1")
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [selectedSectionGroup, setSelectedSectionGroup] = useState<string | null>(null)
  const [selectedRack, setSelectedRack] = useState<string | null>(null)
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === 'rtl'

  const currentWarehouse = warehouseData[selectedWarehouse as keyof typeof warehouseData]

  const selectedProducts: Product[] = selectedSection
    ? (currentWarehouse.products[selectedSection as keyof typeof currentWarehouse.products] as Product[] | undefined) ||
      []
    : []

  const getSectionFillPercentage = (sectionId: string): number => {
    const cells = rackCellsData[sectionId]
    if (!cells || cells.length === 0) return 0

    const totalItems = cells.reduce((sum, cell) => sum + cell.quantity, 0)
    const percentage = (totalItems / RACK_MAX_CAPACITY) * 100
    return percentage
  }

  const getColorPairByFillPercentage = (percentage: number): { fill: string; background: string } => {
    if (percentage === 0) return { fill: "", background: "" }

    // Above 75%: Red
    if (percentage > 75) {
      return { fill: "#F8564B", background: "#F5C3C1" }
    }

    // Between 50-75%: Orange/Yellow
    if (percentage >= 50) {
      return { fill: "#FE9F2D", background: "#f5dec2" }
    }

    // Below 50%: Green
    return { fill: "#3FC8A7", background: "#ADDED6" }
  }


  const getStatusBadge = (status: string) => {
    switch (status) {
      case null:
        return null
      case "low-stock":
        return <span className="text-xs text-amber-600">{t('Low stock')}</span>
      case "out-of-stock":
        return <span className="text-xs text-red-600">{t('Out of stock')}</span>
      case "expiring":
        return <span className="text-xs text-amber-600">{t('About to expire')}</span>
      case "updated":
        return <span className="text-xs text-[#1A3D63]">{t('New updated')}</span>
      default:
        return null
    }
  }

  const getRackCapacity = (rackId: string) => {
    const cells = rackCellsData[rackId] || []
    const totalItems = cells.reduce((sum, cell) => sum + cell.quantity, 0)
    const percentage = (totalItems / RACK_MAX_CAPACITY) * 100
    return { totalItems, percentage }
  }

  

  const totalSections = currentWarehouse.sectionGroups.reduce((acc, group) => acc + group.sections.length, 0)

  const selectedGroupData = selectedSectionGroup
    ? currentWarehouse.sectionGroups.find((g) => g.id === selectedSectionGroup)
    : null
  const occupiedCount = selectedGroupData?.sections.filter((s) => s.occupied).length || 0
  const totalCount = selectedGroupData?.sections.length || 0
  const usagePercentage = totalCount > 0 ? Math.round((occupiedCount / totalCount) * 100) : 0

  const rackCells = selectedRack ? rackCellsData[selectedRack] || [] : []
  const rackCapacity = selectedRack ? getRackCapacity(selectedRack) : { totalItems: 0, percentage: 0 }


  // Helper function to get color based on fill percentage for the rack capacity bar
  const getColorByFillPercentage = (percentage: number): string => {
    if (percentage > 75) {
      return "#F8564B" // Red for > 75%
    } else if (percentage >= 50) {
      return "#FE9F2D" // Orange/Yellow for 50-75%
    } else {
      return "#3FC8A7" // Green for < 50%
    }
  }

  const { colors } = useTheme()

  return (
    <>
      <style>{`
        .diagonal-stripes {
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(0, 0, 0, 0.03) 10px,
            rgba(0, 0, 0, 0.03) 20px
          );
        }
      `}</style>

      <div className={"relative flex h-screen"} style={{ background: colors.background }}>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={`px-6 py-4 ${isDarkMode ? "bg-gray-800 border-gray-700" : ""}`} style={{ background: colors.background }}>
            <div className="flex items-center justify-between">
              {/* Search bar */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} text-[#1B475D] top-1/2 transform -translate-y-1/2 h-5 w-5`} />
                  <input
                    type="text"
                    placeholder={t('Find inventory, orders or reports')}
                    className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border border-gray-200 bg-[#FFF] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A7FA7] focus:border-transparent ${
                      isDarkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : ""
                    }`}
                  />
                </div>
              </div>

              {/* Right side icons */}
              <div className="flex items-center gap-2">
                {/* Notification bell */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={`rounded-full w-10 h-10 border border rounded-[50%] border-[#1A3D63] hover:bg-gray-100 ${isDarkMode ? "hover:bg-gray-700" : ""}`}
                >
                  <Bell className="h-8 w-8 text-gray-600 " />
                </Button>

                {/* Calendar */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={`rounded-full w-10 h-10 border rounded-[50%] border-[#1A3D63] hover:bg-gray-100 ${isDarkMode ? "hover:bg-gray-700" : ""}`}
                >
                  <CalendarDays className="h-8 w-8 text-gray-600" />
                </Button>
                <div className="border rounded-4xl border-[#FFF]">
                  {/* Light mode indicator */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-full w-10 h-10  ${isDarkMode ? "hover:bg-gray-700" : "bg-yellow-400 hover:bg-yellow-500"}`}
                    onClick={() => setIsDarkMode(!isDarkMode)}
                  >
                    <Sun className={`h-5 w-5 ${isDarkMode ? "text-gray-400" : "text-white"}`} />
                  </Button>

                  {/* Dark mode toggle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-full w-10 h-10 hover:bg-gray-100 ${isDarkMode ? "hover:bg-gray-700" : ""}`}
                    onClick={() => setIsDarkMode(!isDarkMode)}
                  >
                    <Moon className={`h-5 w-5 ${isDarkMode ? "text-white" : "text-gray-600"}`} />
                  </Button>
                </div>

                {/* User profile pill */}
                <Button
                  variant="ghost"
                  className={`rounded-full pl-2 pr-4 h-10 hover:bg-gray-100 gap-2 ${isDarkMode ? "hover:bg-gray-700" : ""}`}
                >
                  <img
                    src="/22.jpeg"
                    alt="User"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Henry Kaul
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>
              </div>
            </div>
          </div>

          <header className={`px-6 py-4 ${isDarkMode ? "bg-gray-800" : ""}`} style={{ background: colors.background }}>
            {/* First row: Title and action buttons */}
            <div className={"flex items-center justify-between mb-4"} style={{ background: colors.background }} >
              <h1 className={`text-3xl font-semibold ${isDarkMode ? "text-white" : "text-[#1A3D63]"}`}>
                {t('Warehouses ({{count}})', { count: warehouses.length })}
              </h1>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={`gap-2 bg-white rounded-full border border-gray-200 hover:border-[#4A7FA7] hover:bg-gray-50 transition-all px-4 shadow-sm ${isDarkMode ? "bg-gray-700 border-gray-600 hover:bg-gray-600" : ""}`}
                >
                  <ArrowUpDown className="h-4 w-4 text-gray-500" />
                  <span className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>{t('Sort by')}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`gap-2 bg-white rounded-full border border-gray-200 hover:border-[#4A7FA7] hover:bg-gray-50 transition-all px-4 shadow-sm ${isDarkMode ? "bg-gray-700 border-gray-600 hover:bg-gray-600" : ""}`}
                >
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>{t('Filter by (4)')}</span>
                </Button>
              </div>
            </div>

            {/* Second row: Warehouse tabs with navigation */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                {warehouses.map((warehouse) => (
                  <Button
                    key={warehouse.id}
                    variant={selectedWarehouse === warehouse.id ? "default" : "outline"}
                    size="lg"
                    onClick={() => {
                      setSelectedWarehouse(warehouse.id)
                      setSelectedSection(null)
                      setSelectedSectionGroup(null)
                      setSelectedRack(null)
                      setSelectedCell(null)
                    }}
                    className={`rounded-full px-8 py-6 text-base font-medium transition-all ${
                      selectedWarehouse === warehouse.id
                        ? "bg-[#1A3D63] text-white hover:bg-[#2C5F7F] shadow-md"
                        : `bg-white text-gray-700 border border-gray-200 hover:border-[#4A7FA7] hover:bg-gray-50 shadow-sm ${isDarkMode ? "border-gray-600 hover:bg-gray-700" : ""}`
                    }`}
                  >
                    {warehouse.name}
                  </Button>
                ))}
              </div>

              {/* Navigation arrows and add button */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className={`rounded-full w-12 h-12 border-none shadow-md ${isDarkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-[#1A3D63] text-white hover:bg-[#2C5F7F]"}`}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className={`rounded-full w-12 h-12 border-none shadow-md ${isDarkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-[#1A3D63] text-white hover:bg-[#2C5F7F]"}`}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className={`rounded-full w-12 h-12 border-none shadow-md ${isDarkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-[#1A3D63] text-white hover:bg-[#2C5F7F]"}`}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </header>

          <div className={`flex-1 overflow-auto p-6`} style={{ background: colors.background }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1600px] mx-auto">
              <div className="lg:col-span-2">
                <Card
                  className={`p-6 bg-white shadow-sm border border-gray-200 rounded-2xl ${isDarkMode ? "bg-gray-800 border-gray-700" : ""}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-[#1A3D63]"}`}>
                      {t('Section Overview')} ({totalSections})
                    </h2>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className={`gap-2 bg-white rounded-full border border-gray-200 hover:border-[#4A7FA7] hover:bg-gray-50 transition-all px-4 shadow-sm ${isDarkMode ? "bg-gray-700 border-gray-600 hover:bg-gray-600" : ""}`}
                      >
                        <Plus className="h-4 w-4 text-gray-500" />
                        <span className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>{t('Add Request')}</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`gap-2 bg-white rounded-full border border-gray-200 hover:border-[#4A7FA7] hover:bg-gray-50 transition-all px-4 shadow-sm ${isDarkMode ? "bg-gray-700 border-gray-600 hover:bg-gray-600" : ""}`}
                      >
                        <Edit className="h-4 w-4 text-gray-500" />
                        <span className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>{t('Edit Section')}</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 text-sm h-8 bg-white rounded-full border border-gray-200 hover:border-red-400 transition-all px-4 shadow-sm ${isDarkMode ? "bg-gray-700 border-gray-600 hover:bg-red-600/20" : ""}`}
                      >
                        <Trash2 className="h-3 w-3" />
                        <span className={`text-sm ${isDarkMode ? "text-red-400" : ""}`}>{t('Delete Section')}</span>
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {currentWarehouse.sectionGroups.map((group) => (
                      <Card
                        key={group.id}
                        className={`p-4 border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer ${
                          selectedSectionGroup === group.id ? "ring-2 ring-[#4A7FA7]" : "border-gray-200"
                        } ${isDarkMode ? "bg-gray-800 border-gray-700" : ""}`}
                        onClick={() => setSelectedSectionGroup(group.id)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className={`font-medium text-sm ${isDarkMode ? "text-gray-300" : "text-gray-900"}`}>{group.name}</h3>
                          <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                            {group.usage}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {group.sections.map((section) => {
                            const fillPercentage = section.occupied ? getSectionFillPercentage(section.id) : 0
                            const colorPair = getColorPairByFillPercentage(fillPercentage)
                            const isSelected = selectedSectionGroup === group.id && selectedRack === section.id

                            return (
                              <button
                                key={section.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (section.occupied) {
                                    setSelectedRack(section.id)
                                    setSelectedSection(null)
                                    setSelectedCell(null)
                                    setSelectedSectionGroup(group.id)
                                  }
                                }}
                                disabled={!section.occupied}
                                className={`aspect-square rounded-xl flex items-center justify-center font-medium text-xs transition-all relative overflow-hidden ${
                                  section.occupied
                                    ? "cursor-pointer hover:shadow-lg hover:scale-105"
                                    : "cursor-not-allowed border-2 border-dashed border-gray-300 diagonal-stripes bg-gray-50 text-gray-900"
                                } ${isSelected ? "ring-2 ring-[#4A7FA7]" : ""} ${isDarkMode ? "bg-gray-700 border-gray-600 text-white" : ""}`}
                              >
                                {section.occupied && (
                                  <div
                                    className="absolute inset-0 rounded-xl"
                                    style={{ backgroundColor: colorPair.background }}
                                  />
                                )}

                                {section.occupied && fillPercentage > 0 && (
                                  <div
                                    className="absolute inset-0 rounded-xl transition-all"
                                    style={{
                                      backgroundColor: colorPair.fill,
                                      width: `${fillPercentage}%`,
                                    }}
                                  />
                                )}

                                <span
                                  className={`relative z-10 text-white font-semibold drop-shadow-sm ${isDarkMode ? "text-black" : ""}`}
                                >
                                  {section.id}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-1">
                <Card
                  className={`p-6 bg-white shadow-sm border border-gray-200 rounded-2xl mb-6 ${isDarkMode ? "bg-gray-800 border-gray-700" : ""}`}
                >
                  <h2 className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-[#1A3D63]"} mb-6`}>
                    {selectedSectionGroup ? `${selectedSectionGroup} - ${t('Section Usage')}` : t('Section Usage')}
                  </h2>
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative w-40 h-40">
                      <svg className="w-40 h-40 transform -rotate-90">
                        <circle cx="80" cy="80" r="60" stroke="#f0f0f0" strokeWidth="20" fill="none" />
                        <circle
                          cx="80"
                          cy="80"
                          r="60"
                          stroke="url(#gradient)"
                          strokeWidth="20"
                          fill="none"
                          strokeDasharray={`${(usagePercentage / 100) * 377} 377`}
                          strokeLinecap="round"
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            {/* Updated gradient colors */}
                            <stop offset="0%" stopColor="#FBBF24" />
                            <stop offset="100%" stopColor="#F59E0B" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                          {usagePercentage}%
                        </span>
                        <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{t('Location Used')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                        {totalCount}
                      </div>
                      <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{t('Total Shelves')}</div>
                    </div>
                    <div>
                      <div className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                        {totalCount - occupiedCount}
                      </div>
                      <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{t('Empty Shelves')}</div>
                    </div>
                    <div>
                      <div className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                        {occupiedCount}
                      </div>
                      <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{t('Full Shelves')}</div>
                    </div>
                    <div>
                      <div className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>0</div>
                      <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{t('Newly Added')}</div>
                    </div>
                  </div>
                </Card>

                <Card
                  className={`p-6 bg-white shadow-sm border border-gray-200 rounded-2xl ${isDarkMode ? "bg-gray-800 border-gray-700" : ""}`}
                >
                  <h2 className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-[#1A3D63]"} mb-6`}>{t('Inventory Overview')}</h2>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Package className={`h-4 w-4 ${isDarkMode ? "text-gray-400" : "text-gray-400"}`} />
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          26% <TrendingUp className="h-3 w-3" />
                        </span>
                      </div>
                      <div className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>4,236</div>
                      <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{t('Orders Received')}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Package className={`h-4 w-4 ${isDarkMode ? "text-gray-400" : "text-gray-400"}`} />
                        <span className="text-xs text-red-600 flex items-center gap-1">
                          20% <TrendingDown className="h-3 w-3" />
                        </span>
                      </div>
                      <div className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>2,778</div>
                      <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{t('Orders Shipped')}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className={`h-4 w-4 ${isDarkMode ? "text-gray-400" : "text-gray-400"}`} />
                        <span className="text-xs text-red-600 flex items-center gap-1">
                          8% <TrendingDown className="h-3 w-3" />
                        </span>
                      </div>
                      <div className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>147</div>
                      <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{t('Orders Returned')}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Package className={`h-4 w-4 ${isDarkMode ? "text-gray-400" : "text-gray-400"}`} />
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          6% <TrendingUp className="h-3 w-3" />
                        </span>
                      </div>
                      <div className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>537</div>
                      <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{t('Orders Canceled')}</div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {selectedSection && (
          <>
            <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelectedSection(null)} />

            <div
              className={`fixed ${isRTL ? 'left-0' : 'right-0'} top-0 bottom-0 w-full md:w-[500px] bg-white shadow-2xl z-50 flex flex-col ${isDarkMode ? "bg-gray-800" : ""}`}
            >
              <div className={`p-6 border-b border-gray-200 ${isDarkMode ? "border-gray-700" : ""}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{t('Products')}</h3>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedSection(null)} className="h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div
                  className={`flex items-center gap-4 text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"} ${isRTL ? 'pr-[76px]' : 'pl-[76px]'}`}
                >
                  <div className="flex-1">{t('Product name')}</div>
                  <div className="w-24 text-center">{t('In stock')}</div>
                  <div className={`w-16 ${isRTL ? 'text-left' : 'text-right'}`}>{t('Price')}</div>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <div className="divide-y divide-gray-100">
                  {selectedProducts.length > 0 ? (
                    selectedProducts.map((product) => (
                      <div
                        key={product.id}
                        className={`p-4 hover:bg-gray-50 transition-colors ${isDarkMode ? "hover:bg-gray-700" : ""}`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              product.status === "out-of-stock"
                                ? "bg-orange-500"
                                : product.status === "updated"
                                  ? "bg-teal-500"
                                  : product.status === "expiring"
                                    ? "bg-orange-500"
                                    : "bg-green-500"
                            }`}
                          />

                          <img
                            src={product.image || "/placeholder.svg"}
                            alt={product.name}
                            className="w-16 h-16 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className={`text-sm font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                {product.code}
                              </span>
                              <h4 className={`font-semibold text-base ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                {product.name}
                              </h4>
                            </div>
                            {getStatusBadge(product.status)}
                          </div>

                          <div className="flex flex-col items-center gap-1 w-24 flex-shrink-0">
                            <span className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                              {product.stock}
                              <span className={`text-gray-400 ${isDarkMode ? "text-gray-500" : ""}`}>
                                /{product.total}
                              </span>
                            </span>
                            <div
                              className={`w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden ${isDarkMode ? "bg-gray-700" : ""}`}
                            >
                              <div
                                className={`h-full rounded-full ${
                                  product.status === "out-of-stock"
                                    ? "bg-orange-500"
                                    : product.status === "low-stock"
                                      ? "bg-orange-500"
                                      : "bg-[#4A7FA7]"
                                }`}
                                style={{ width: `${Math.min((product.stock / product.total) * 100, 100)}%` }}
                              />
                            </div>
                          </div>

                          <span
                            className={`text-base font-semibold w-16 text-right flex-shrink-0 ${isDarkMode ? "text-white" : "text-gray-900"}`}
                          >
                            ${product.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <p className="text-sm">{t('No products in this section')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Replaced center modal with right-side sliding sidebar */}
        {selectedRack && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelectedRack(null)} />

            {/* Side Sliding Sidebar (RTL-aware) */}
            <div
              className={`fixed top-0 ${isRTL ? 'left-0' : 'right-0'} h-full w-full md:w-[480px] z-50 transform transition-transform duration-300 ease-in-out ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              } shadow-2xl overflow-y-auto`}
            >
              {/* Header */}
              <div
                className={`sticky top-0 z-10 border-b p-6 ${
                  isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-[#1A3D63]"}`}>{t('Rack {{id}}', { id: selectedRack })}</h3>
                    <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"} mt-1`}>
                      {t('Inventory Details')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedRack(null)
                      setSelectedCell(null)
                    }}
                    className="h-10 w-10"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>{t('Capacity')}</span>
                    <span className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-[#1A3D63]"}`}>
                      {rackCapacity.totalItems} / {RACK_MAX_CAPACITY}
                    </span>
                  </div>
                  <div
                    className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(rackCapacity.percentage, 100)}%`, backgroundColor: getColorByFillPercentage(rackCapacity.percentage) }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {Math.round(rackCapacity.percentage)}% {t('Filled')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content: per-cell cards */}
              <div className="p-6">
                {rackCells.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {rackCells.map((cell) => {
                      const maxCellCapacity = RACK_MAX_CAPACITY / 6
                      const percent = Math.min((cell.quantity / maxCellCapacity) * 100, 100)
                      const barColor = getColorByFillPercentage((cell.quantity / RACK_MAX_CAPACITY) * 100)

                      return (
                        <div
                          key={cell.id}
                          className={`rounded-xl border p-4 ${isDarkMode ? 'bg-gray-800/70 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}
                        >
                          {/* Title */}
                          <div className="flex items-center justify-between mb-2">
                            <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-[#1A3D63]'}`}>{t('Cell {{id}}', { id: cell.id })}</h4>
                            <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-[#1A3D63]'}`}>{cell.quantity} / {maxCellCapacity}</span>
                          </div>
                          {/* Capacity bar */}
                          <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: barColor }} />
                          </div>
                          <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{Math.round(percent)}% {t('Filled')}</div>

                          {/* Items list */}
                          <div className="mt-4 space-y-3">
                            {cell.item ? (
                              <div className={`flex items-center justify-between gap-3 p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                                <div className="flex items-center gap-3 min-w-0">
                                  <img
                                    src={itemImages[cell.item] || '/placeholder.svg?height=40&width=40'}
                                    alt={cell.item}
                                    className="w-10 h-10 rounded-md object-cover bg-gray-100"
                                  />
                                  <div className="min-w-0">
                                    <div className={`font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{cell.item}</div>
                                    <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('Good')}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{cell.quantity} / {maxCellCapacity}</div>
                                  <div className={`w-28 h-1.5 mt-1 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                                    <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: barColor }} />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className={`p-3 rounded-lg text-sm ${isDarkMode ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>{t('Empty')}</div>
                            )}
                          </div>

                          {/* Total in cell */}
                          <div className={`mt-4 p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-blue-50 border-blue-200'}`}>
                            <div className="flex items-center justify-between">
                              <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-[#1A3D63]'}`}>{t('Total Items in Cell')}</span>
                              <span className={`font-bold text-lg ${isDarkMode ? 'text-blue-300' : 'text-[#4A7FA7]'}`}>{cell.quantity}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('No cells for this rack')}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
