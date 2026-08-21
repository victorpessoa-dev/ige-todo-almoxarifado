import { MotionReveal } from '@/components/animations/Motion'
import { Card, CardContent } from '@/components/ui/card'

const SUMMARY_ITEMS = [
  { key: 'total', label: 'Produtos cadastrados' },
  { key: 'visible', label: 'Visíveis no catálogo' },
  { key: 'categories', label: 'Total de categorias' },
  { key: 'brands', label: 'Total de marcas' }
]

export default function CatalogoSummaryCards({ summary }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {SUMMARY_ITEMS.map((item, index) => (
        <MotionReveal key={item.key} delay={index * 0.05} className="h-full">
          <Card className="h-full transition-shadow hover:shadow-md">
          <CardContent className="p-2.5 sm:p-4">
            <p className="text-[10px] uppercase leading-tight text-muted-foreground sm:text-xs">
              {item.label}
            </p>
            <p className="text-xl font-bold sm:text-2xl">{summary[item.key]}</p>
          </CardContent>
          </Card>
        </MotionReveal>
      ))}
    </div>
  )
}
