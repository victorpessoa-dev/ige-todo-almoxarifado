export default function CatalogoPreview({ frameHtml }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm sm:rounded-2xl">
      <div className="border-b px-3 py-2 text-xs text-muted-foreground sm:px-4 sm:py-3 sm:text-sm">
        Visualização da página personalizada. Use Imprimir / Salvar PDF para gerar o PDF pelo navegador.
      </div>
      <iframe
        srcDoc={frameHtml}
        title="Visualização simples do catálogo"
        className="h-[68vh] min-h-[480px] w-full bg-muted/30 sm:h-[calc(100vh-260px)] sm:min-h-[620px]"
      />
    </div>
  )
}
