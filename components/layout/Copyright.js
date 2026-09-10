export function Copyright({ className = '' }) {
  return <p className={`text-center text-xs ${className}`}>© 2026 Victor Pessoa. Todos os direitos reservados.</p>
}

export function PublicFooter() {
  return (
    <footer className="w-full shrink-0 px-4 py-4 text-muted-foreground">
      <Copyright />
    </footer>
  )
}
