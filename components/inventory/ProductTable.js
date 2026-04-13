'use client'

import { Button } from '@/components/ui/button'
import Barcode from 'react-barcode'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TrendingUp, TrendingDown, Printer } from 'lucide-react'

export default function ProductTable({ produtos, openMovimentoDialog, setPrintDialog, handleEdit, deleteProduto }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtos</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Cód. Barras</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Mín</TableHead>
              <TableHead>Máx</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtos.map((produto) => (
              <TableRow key={produto.id}>
                <TableCell>{produto.cod}</TableCell>
                <TableCell>{produto.nome}</TableCell>
                <TableCell>
                    {produto.cod_barra ? (
                        <Barcode
                        value={String(produto.cod)}
                        format="CODE128"
                        width={1}
                        height={40}
                        fontSize={10}
                        />
                    ) : (
                        '-'
                    )}
                </TableCell>
                <TableCell>{produto.estoque}</TableCell>
                <TableCell>{produto.min}</TableCell>
                <TableCell>{produto.max}</TableCell>
                <TableCell>
                  {produto.estoque <= produto.min ? (
                    <Badge variant="outline" className="bg-red-50 text-red-700">
                      Baixo
                    </Badge>
                  ) : produto.estoque >= produto.max ? (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                      Cheio
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Normal
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openMovimentoDialog(produto, 'entrada', 1)}>
                      <TrendingUp className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openMovimentoDialog(produto, 'saida', 1)}
                      disabled={produto.estoque === 0}
                    >
                      <TrendingDown className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPrintDialog({ open: true, produto })}>
                      <Printer className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(produto)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteProduto(produto.id)}>
                      Excluir
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
