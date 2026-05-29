function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function normalizeCatalogText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;:/\\|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getCategoryName(produto) {
  return String(produto?.categoria || 'Sem categoria').trim() || 'Sem categoria'
}

function splitBrands(value) {
  return String(value || '')
    .split(/[,;/]+/)
    .map((brand) => brand.trim())
    .filter(Boolean)
}

export function getUniqueBrandNames(value) {
  const brands = new Map()

  splitBrands(value).forEach((brand) => {
    const normalizedBrand = normalizeCatalogText(brand)

    if (normalizedBrand && !brands.has(normalizedBrand)) {
      brands.set(normalizedBrand, brand)
    }
  })

  return Array.from(brands.values())
}

function getFirstBrandName(produto) {
  return getUniqueBrandNames(produto?.marcas)[0] || ''
}

export function countUniqueCategories(produtos = []) {
  const categories = new Set()

  produtos.forEach((produto) => {
    const normalizedCategory = normalizeCatalogText(getCategoryName(produto))

    if (normalizedCategory && normalizedCategory !== 'sem categoria') {
      categories.add(normalizedCategory)
    }
  })

  return categories.size
}

export function countUniqueBrands(produtos = []) {
  const brands = new Set()

  produtos.forEach((produto) => {
    splitBrands(produto.marcas).forEach((brand) => {
      const normalizedBrand = normalizeCatalogText(brand)

      if (normalizedBrand) {
        brands.add(normalizedBrand)
      }
    })
  })

  return brands.size
}

export function filterAndSortCatalogProducts(
  produtos = [],
  { search = '', selectedCategory = 'todas', selectedBrand = 'todas' } = {}
) {
  const normalizedSearch = search.trim().toLowerCase()

  return produtos
    .filter((produto) => {
      const category = getCategoryName(produto)
      const categoryMatch =
        selectedCategory === 'todas' ||
        normalizeCatalogText(category) === normalizeCatalogText(selectedCategory)
      const brandMatch =
        selectedBrand === 'todas' ||
        getUniqueBrandNames(produto.marcas).some(
          (brand) => normalizeCatalogText(brand) === normalizeCatalogText(selectedBrand)
        )

      if (!normalizedSearch) return categoryMatch && brandMatch

      const searchable = [
        produto.nome,
        produto.cod,
        produto.categoria,
        produto.aplicacao,
        produto.medidas,
        produto.marcas
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return categoryMatch && brandMatch && searchable.includes(normalizedSearch)
    })
    .sort((a, b) => {
      const categoryCompare = getCategoryName(a).localeCompare(getCategoryName(b), 'pt-BR')

      if (categoryCompare !== 0) return categoryCompare

      const brandCompare = getFirstBrandName(a).localeCompare(getFirstBrandName(b), 'pt-BR')

      if (brandCompare !== 0) return brandCompare

      return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')
    })
}

export function makeCatalogFrameHtml(produtos = []) {
  const generatedDate = new Date().toLocaleDateString('pt-BR')
  const fileDate = new Date().toISOString().slice(0, 10)
  const groupedProducts = produtos.reduce((groups, produto) => {
    const categoria = getCategoryName(produto)
    const categoryKey = normalizeCatalogText(categoria)
    const current = groups.get(categoryKey) || { label: categoria, items: [] }

    current.items.push(produto)
    groups.set(categoryKey, current)

    return groups
  }, new Map())
  const totalCategorias = countUniqueCategories(produtos)
  const totalMarcas = countUniqueBrands(produtos)

  const rows = Array.from(groupedProducts.values())
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
    .map(({ label: categoria, items }) => {
      const sortedItems = [...items].sort((a, b) =>
        String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')
      )

      const productsHtml = sortedItems.map((produto) => {
        const min = Number(produto.min || 0)
        const max = Number(produto.max || 0)
        const marcas = getUniqueBrandNames(produto.marcas)
        const marcasText = marcas.length > 0 ? marcas.join(', ') : '-'
        const image = produto.img_url
          ? `<img src="${escapeHtml(produto.img_url)}" alt="Imagem técnica de ${escapeHtml(produto.nome || 'produto')}" />`
          : '<div class="image-placeholder">Sem imagem</div>'

      return `
        <article class="product">
          <div class="image">${image}</div>
          <div class="content">
            <div class="topline">
              <span class="code">Cód. ${escapeHtml(produto.cod || '-')}</span>
            </div>
            <h2>${escapeHtml(produto.nome || '-')}</h2>
            <div class="grid">
              <div><span>Categoria</span><strong>${escapeHtml(produto.categoria || '-')}</strong></div>
              <div><span>Medidas</span><strong>${escapeHtml(produto.medidas || '-')}</strong></div>
              <div><span>Marcas disponíveis</span><strong>${escapeHtml(marcasText)}</strong></div>
              <div><span>Máx. e Mín.</span><strong>Máx: ${max} | Mín: ${min}</strong></div>
            </div>
            <div class="application">
              <span>Aplicação</span>
              <p>${escapeHtml(produto.aplicacao || '-')}</p>
            </div>
          </div>
        </article>
      `
    }).join('')

    return `
      <section class="category">
        <div class="category-title">
          <h2>${escapeHtml(categoria)}</h2>
          <span>${items.length} produto(s)</span>
        </div>
        ${productsHtml}
      </section>
    `
  }).join('')

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>catalogo-almoxarifado-${fileDate}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #eef2f7; color: #111827; font-family: Arial, Helvetica, sans-serif; }
    main { max-width: 1040px; margin: 0 auto; padding: 14px; }
    .cover {
      min-height: 920px;
      background: #fff;
      border: 1px solid #d7dde6;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 42px;
      margin-bottom: 10px;
      position: relative;
      overflow: hidden;
      break-inside: avoid;
    }
    .cover::after {
      content: '';
      position: absolute;
      right: -120px;
      bottom: -120px;
      width: 330px;
      height: 330px;
      border: 46px solid #dbeafe;
      border-radius: 999px;
      opacity: 0.75;
      z-index: 0;
    }
    .cover::before {
      content: '';
      position: absolute;
      inset: 0 0 auto 0;
      height: 12px;
      background: linear-gradient(90deg, #0f172a, #1d4ed8, #38bdf8);
      z-index: 2;
    }
    .cover > * { position: relative; z-index: 1; }
    .cover-brand { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
    .cover-brand img { width: 150px; height: auto; object-fit: contain; }
    .cover-tag { color: #475569; font-size: 12px; font-weight: 700; letter-spacing: 0; text-transform: uppercase; }
    .cover-title { max-width: 720px; margin: 70px 0; }
    .cover-title h1 {
      margin: 0;
      max-width: 660px;
      color: #0f172a;
      font-family: 'Arial Black', Arial, Helvetica, sans-serif;
      font-size: 56px;
      font-weight: 900;
      line-height: 0.98;
      text-transform: uppercase;
    }
    .cover-title h1::after {
      content: '';
      display: block;
      width: 140px;
      height: 6px;
      margin-top: 18px;
      background: linear-gradient(90deg, #0f172a, #1d4ed8, #38bdf8);
    }
    .cover-title p { max-width: 560px; margin: 14px 0 0; color: #475569; font-size: 16px; line-height: 1.45; }
    .cover-info {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      border-top: 1px solid #e5e7eb;
      padding-top: 14px;
    }
    .cover-info div {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      padding: 10px 12px;
    }
    .cover-info span { display: block; color: #64748b; font-size: 10px; text-transform: uppercase; }
    .cover-info strong { display: block; margin-top: 3px; font-size: 18px; }
    .grid span, .application span { display: block; color: #64748b; font-size: 9px; text-transform: uppercase; }
    .products-list { padding: 14px 0 0; }
    .category { margin-bottom: 8px; break-inside: avoid; }
    .category-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      background: #111827;
      color: #fff;
      padding: 6px 9px;
      margin-bottom: 6px;
    }
    .category-title h2 { margin: 0; font-size: 13px; text-transform: uppercase; }
    .category-title span { color: #dbeafe; font-size: 10px; font-weight: 700; white-space: nowrap; }
    .product {
      display: grid;
      grid-template-columns: 112px 1fr;
      gap: 10px;
      background: #fff;
      border: 1px solid #d7dde6;
      padding: 9px;
      margin-bottom: 7px;
      break-inside: avoid;
    }
    .image img, .image-placeholder {
      width: 100px;
      height: 78px;
      border: 1px solid #d7dde6;
      background: #f8fafc;
      object-fit: contain;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      font-size: 10px;
    }
    .topline { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
    .code { color: #2563eb; font-weight: 700; font-size: 10px; }
    .content h2 { margin: 4px 0 7px; font-size: 15px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .grid strong { display: block; margin-top: 2px; font-size: 11px; line-height: 1.2; }
    .application { margin-top: 7px; border-top: 1px solid #e5e7eb; padding-top: 6px; }
    .application p { margin: 2px 0 0; font-size: 11px; line-height: 1.25; }
    .empty { padding: 20px; text-align: center; color: #64748b; border: 1px dashed #cbd5e1; background: #fff; }
    footer { margin-top: 10px; color: #64748b; text-align: center; font-size: 10px; }
    @media screen and (max-width: 720px) {
      main { padding: 8px; }
      .cover {
        min-height: 620px;
        padding: 24px 18px;
      }
      .cover::after {
        right: -170px;
        bottom: -170px;
      }
      .cover-brand {
        align-items: flex-start;
        flex-direction: column;
        gap: 12px;
      }
      .cover-brand img { width: 126px; }
      .cover-tag { font-size: 10px; }
      .cover-title { margin: 42px 0; }
      .cover-title h1 { font-size: 34px; line-height: 1.04; }
      .cover-title h1::after { width: 104px; height: 5px; margin-top: 14px; }
      .cover-title p { font-size: 13px; line-height: 1.35; }
      .cover-info { grid-template-columns: 1fr; }
      .product {
        grid-template-columns: 1fr;
        gap: 8px;
        padding: 8px;
      }
      .image img, .image-placeholder {
        width: 100%;
        height: 116px;
      }
      .topline { align-items: flex-start; }
      .content h2 { font-size: 14px; line-height: 1.2; }
      .grid { grid-template-columns: repeat(2, 1fr); }
      .category-title {
        align-items: flex-start;
        flex-direction: column;
        gap: 3px;
      }
    }
    @media screen and (max-width: 420px) {
      .cover-title h1 { font-size: 29px; }
      .grid { grid-template-columns: 1fr; }
      .image img, .image-placeholder { height: 104px; }
    }
    @media print {
      body { background: #fff; }
      main { max-width: none; padding: 0; }
      .cover {
        min-height: 100vh;
        margin-bottom: 0;
        page-break-after: always;
        break-after: page;
      }
      .cover, .product { border-color: #cbd5e1; }
      .products-list { padding: 12px 10px 0; }
      .category-title { background: #111827 !important; color: #fff !important; }
      .product { margin-bottom: 5px; padding: 7px; }
    }
  </style>
</head>
<body>
  <main>
    <section class="cover">
      <div class="cover-brand">
        <img src="/ige-supergesso.png" alt="IGE Supergesso" />
        <div class="cover-tag">Inventário e controle de materiais</div>
      </div>
      <div class="cover-title">
        <h1>Catálogo do Almoxarifado</h1>
        <p>Relação técnica organizada por categoria, com aplicação, medidas, marcas disponíveis e imagem.</p>
      </div>
      <div class="cover-info">
        <div><span>Total de produtos</span><strong>${produtos.length}</strong></div>
        <div><span>Total de categorias</span><strong>${totalCategorias}</strong></div>
        <div><span>Total de marcas</span><strong>${totalMarcas}</strong></div>
        <div><span>Gerado em</span><strong>${generatedDate}</strong></div>
      </div>
    </section>
    <section class="products-list">
      ${produtos.length === 0
        ? '<div class="empty">Nenhum produto encontrado.</div>'
        : rows}
    </section>
    <footer>IGE Supergesso - Catálogo gerado pelo sistema de inventário.</footer>
  </main>
</body>
</html>`
}
