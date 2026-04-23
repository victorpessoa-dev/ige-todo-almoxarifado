'use client'

import { useRef } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabaseClient'
import { useData } from '@/contexts/data-context'

export default function ImportExportProdutos() {
  const { produtos } = useData()
  const fileInputRef = useRef(null)


  const exportToCSV = () => {
    const headers = ['cod', 'nome', 'estoque', 'max', 'min']

    const rows = produtos.map((p) => [
      p.cod,
      p.nome,
      p.estoque,
      p.max,
      p.min
    ])

    const csv =
      [headers, ...rows]
        .map((r) => r.join(';'))
        .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = 'produtos.csv'
    link.click()
  }

  
  const exportToXLSX = () => {
    const data = produtos.map((p) => ({
      cod: p.cod,
      nome: p.nome,
      estoque: p.estoque,
      max: p.max,
      min: p.min
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(wb, ws, 'Produtos')
    XLSX.writeFile(wb, 'produtos.xlsx')
  }


  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = async (evt) => {
      const data = new Uint8Array(evt.target.result)
      const workbook = XLSX.read(data, { type: 'array' })

      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet)

      const novosProdutos = []

      for (const item of json) {
        if (!item.cod || !item.nome) continue

        novosProdutos.push({
          cod: String(item.cod),
          nome: item.nome,
          estoque: Number(item.estoque || 0),
          max: Number(item.max || 0),
          min: Number(item.min || 0),
          cod_barra: String(item.cod) 
        })
      }

      if (novosProdutos.length > 0) {
        const { error } = await supabase
          .from('produtos')
          .insert(novosProdutos)

        if (error) {
          console.error('Erro ao importar:', error)
        } else {
          alert('Importação concluída!')
        }
      }
    }

    reader.readAsArrayBuffer(file)
  }

  return (
    <div className="flex items-center justify-center">
      <div className="flex gap-2 flex-row">
        <Button onClick={exportToCSV}>
          Exp. CSV
        </Button>

        <Button onClick={exportToXLSX}>
          Exp. XLSX
        </Button>

        <Button onClick={() => fileInputRef.current.click()}>
          Imp. Arquivo
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv, .xlsx"
          className="hidden"
          onChange={handleImport}
          />
      </div>
    </div>
  )
}