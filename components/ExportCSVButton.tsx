'use client'

import React from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'

export default function ExportCSVButton({ data, filename }: { data: any[], filename: string }) {
  const downloadCSV = () => {
    if (data.length === 0) return

    // Create CSV header
    const headers = Object.keys(data[0]).join(',')
    
    // Create CSV rows
    const rows = data.map(obj => {
      return Object.values(obj).map(value => {
        const strValue = String(value).replace(/"/g, '""')
        return `"${strValue}"`
      }).join(',')
    })

    const csvContent = [headers, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <button 
      onClick={downloadCSV}
      className="btn btn-outline btn-sm gap-2 hover:btn-primary transition-all shadow-sm"
    >
      <FileSpreadsheet className="w-4 h-4" />
      Export Operational Data (CSV)
    </button>
  )
}
