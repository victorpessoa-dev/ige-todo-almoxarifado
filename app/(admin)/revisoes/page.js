"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, FileText, Printer, RotateCcw, Search } from "lucide-react";

import { useData } from "@/contexts/data-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckboxFilter } from "@/components/ui/checkbox-filter";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/spinner";
import TablePagination from "@/components/ui/table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import SortableTableHead from "@/components/ui/sortable-table-head";
import {
  getInventoryCategory,
  normalizeCategory,
} from "@/lib/inventory/replenishment";

const EXTRA_PRINT_ROWS = 12;
const BLANK_PRINT_ROWS = 28;
const PRINT_ROWS_PER_PAGE = 22;
const DEFAULT_PAGE_SIZE = 50;
const STATUS_ORDER = {
  baixo: 0,
  normal: 1,
  cheio: 2,
};

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR").format(value);
}

function normalizeSearch(value) {
  return normalizeCategory(value).replace(/\s+/g, " ").trim();
}

function getStockStatus(produto) {
  if (Number(produto.estoque || 0) <= Number(produto.min || 0)) {
    return {
      value: "baixo",
      label: "Baixo",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (Number(produto.estoque || 0) >= Number(produto.max || 0)) {
    return {
      value: "cheio",
      label: "Cheio",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    value: "normal",
    label: "Normal",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

function makeEmptyPrintRow(index) {
  return {
    id: `manual-${index}`,
    cod: "",
    nome: "",
    categoria: "",
    estoque: "",
    empty: true,
  };
}

function chunkRows(rows, size) {
  const chunks = [];

  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }

  return chunks;
}

export default function RevisoesPage() {
  const { produtos = [], isLoaded, isLoading } = useData();
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [printBlankSheet, setPrintBlankSheet] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortConfig, setSortConfig] = useState({
    key: "nome",
    direction: "asc",
  });

  const categoryOptions = useMemo(() => {
    const categories = new Map();

    produtos.forEach((produto) => {
      const label = getInventoryCategory(produto);
      categories.set(normalizeCategory(label), label);
    });

    return Array.from(categories.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [produtos]);

  const searchedProducts = useMemo(() => {
    const normalizedQuery = normalizeSearch(searchQuery);

    return produtos.filter((produto) => {
      const categoryKey = normalizeCategory(getInventoryCategory(produto));
      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(categoryKey);

      if (!matchesCategory) return false;

      if (!normalizedQuery) return true;

      return normalizeSearch(
        [
          produto.cod,
          produto.cod_barra,
          produto.nome,
          produto.categoria,
          produto.aplicacao,
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(normalizedQuery);
    });
  }, [produtos, searchQuery, selectedCategories]);

  const filteredProducts = useMemo(() => {
    return [...searchedProducts].sort((a, b) => {
      if (sortConfig.key === "status") {
        const aOrder = STATUS_ORDER[getStockStatus(a).value];
        const bOrder = STATUS_ORDER[getStockStatus(b).value];

        return sortConfig.direction === "asc"
          ? aOrder - bOrder
          : bOrder - aOrder;
      }

      if (sortConfig.key === "categoria") {
        const aCategory = getInventoryCategory(a);
        const bCategory = getInventoryCategory(b);

        return sortConfig.direction === "asc"
          ? aCategory.localeCompare(bCategory, "pt-BR")
          : bCategory.localeCompare(aCategory, "pt-BR");
      }

      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (typeof aValue === "string" || typeof bValue === "string") {
        const aText = String(aValue || "");
        const bText = String(bValue || "");

        return sortConfig.direction === "asc"
          ? aText.localeCompare(bText, "pt-BR")
          : bText.localeCompare(aText, "pt-BR");
      }

      const aNumber = Number(aValue || 0);
      const bNumber = Number(bValue || 0);

      return sortConfig.direction === "asc"
        ? aNumber - bNumber
        : bNumber - aNumber;
    });
  }, [searchedProducts, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }

      return { key, direction: "asc" };
    });
  };

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProducts = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;

    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, pageSize, safeCurrentPage]);

  const selectedCategoryLabels = useMemo(() => {
    if (selectedCategories.length === 0) return "Todas as categorias";

    return categoryOptions
      .filter((option) => selectedCategories.includes(option.value))
      .map((option) => option.label)
      .join(", ");
  }, [categoryOptions, selectedCategories]);

  const lowStockCount = useMemo(
    () =>
      filteredProducts.filter(
        (produto) => Number(produto.estoque || 0) <= Number(produto.min || 0),
      ).length,
    [filteredProducts],
  );

  const printProducts = useMemo(() => {
    if (printBlankSheet) {
      return Array.from({ length: BLANK_PRINT_ROWS }, (_, index) =>
        makeEmptyPrintRow(index),
      );
    }

    return [
      ...filteredProducts,
      ...Array.from({ length: EXTRA_PRINT_ROWS }, (_, index) =>
        makeEmptyPrintRow(index),
      ),
    ];
  }, [filteredProducts, printBlankSheet]);

  const printPages = useMemo(
    () => chunkRows(printProducts, PRINT_ROWS_PER_PAGE),
    [printProducts],
  );

  const handlePrint = (blankSheet = false) => {
    setPrintBlankSheet(blankSheet);
    window.setTimeout(() => window.print(), 0);
  };

  useEffect(() => {
    const handleAfterPrint = () => setPrintBlankSheet(false);

    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  if (isLoading && !isLoaded) {
    return <LoadingState className="min-h-[60vh]" />;
  }

  return (
    <div className="space-y-4 print:space-y-0">
      <section className="print:hidden">
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  Revisoes de estoque
                </CardTitle>
                <p className="max-w-3xl text-sm text-muted-foreground">
                  Filtre por categoria e imprima uma lista de conferencia para
                  comparar estoque fisico com o sistema usado na revisao.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 lg:flex lg:flex-nowrap lg:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-w-0 px-2 text-xs sm:px-3 sm:text-sm"
                  onClick={() => {
                    setSelectedCategories([]);
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="hidden sm:inline">Limpar filtros</span>
                  <span className="sm:hidden">Limpar</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  className="min-w-0 px-2 text-xs sm:px-3 sm:text-sm"
                  onClick={() => handlePrint(false)}
                >
                  <Printer className="h-4 w-4" />
                  <span className="hidden sm:inline">Imprimir relatorio</span>
                  <span className="sm:hidden">Relatorio</span>
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-w-0 px-2 text-xs sm:px-3 sm:text-sm"
                  onClick={() => handlePrint(true)}
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Folha em branco</span>
                  <span className="sm:hidden">Branco</span>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_18rem]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar por produto, codigo ou aplicacao"
                  className="pl-10"
                />
              </div>

              <CheckboxFilter
                label="categoria"
                allLabel="Todas as categorias"
                options={categoryOptions}
                value={selectedCategories}
                onChange={(value) => {
                  setSelectedCategories(value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Produtos</p>
                <p className="text-2xl font-semibold">
                  {filteredProducts.length}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Categorias</p>
                <p className="text-2xl font-semibold">
                  {selectedCategories.length || categoryOptions.length}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Abaixo do minimo</p>
                <p className="text-2xl font-semibold">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="print:hidden">
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Produtos para conferencia</CardTitle>
              <Badge variant="outline">{filteredProducts.length} itens</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhum produto encontrado para os filtros escolhidos.
              </div>
            ) : (
              <>
                <div className="grid gap-3 p-3 lg:hidden">
                  {paginatedProducts.map((produto) => {
                    const status = getStockStatus(produto);

                    return (
                      <div
                        key={produto.id || `${produto.cod}-${produto.nome}`}
                        className="rounded-lg border bg-card p-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p
                              className="line-clamp-2 text-sm font-semibold leading-snug"
                              title={produto.nome || "-"}
                            >
                              {produto.nome || "-"}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`${status.className} shrink-0 text-[11px]`}
                          >
                            {status.label}
                          </Badge>
                        </div>

                        <div className="mt-2 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                          <span className="shrink-0 rounded-md bg-muted px-2 py-1 font-medium text-foreground">
                            Cod: {produto.cod || "-"}
                          </span>
                          <span
                            className="truncate"
                            title={getInventoryCategory(produto)}
                          >
                            {getInventoryCategory(produto)}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <div className="rounded-md border bg-muted/20 px-2 py-2 text-center">
                            <p className="text-[11px] text-muted-foreground">
                              Estoque
                            </p>
                            <p className="mt-0.5 text-sm font-semibold">
                              {Number(produto.estoque || 0)}
                            </p>
                          </div>
                          <div className="rounded-md border bg-muted/20 px-2 py-2 text-center">
                            <p className="text-[11px] text-muted-foreground">
                              Min
                            </p>
                            <p className="mt-0.5 text-sm font-semibold">
                              {Number(produto.min || 0)}
                            </p>
                          </div>
                          <div className="rounded-md border bg-muted/20 px-2 py-2 text-center">
                            <p className="text-[11px] text-muted-foreground">
                              Max
                            </p>
                            <p className="mt-0.5 text-sm font-semibold">
                              {Number(produto.max || 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden lg:block">
                  <Table className="w-full table-fixed">
                    <colgroup>
                      <col className="w-[12%]" />
                      <col className="w-[37%]" />
                      <col className="w-[19%]" />
                      <col className="w-[9%]" />
                      <col className="w-[6%]" />
                      <col className="w-[6%]" />
                      <col className="w-[11%]" />
                    </colgroup>
                    <TableHeader>
                      <TableRow>
                        <SortableTableHead
                          label="Codigo"
                          columnKey="cod"
                          sortConfig={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableTableHead
                          label="Produto"
                          columnKey="nome"
                          sortConfig={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableTableHead
                          label="Categoria"
                          columnKey="categoria"
                          sortConfig={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableTableHead
                          label="Estoque"
                          columnKey="estoque"
                          sortConfig={sortConfig}
                          onSort={handleSort}
                          className="text-right"
                        />
                        <SortableTableHead
                          label="Min"
                          columnKey="min"
                          sortConfig={sortConfig}
                          onSort={handleSort}
                          className="text-right"
                        />
                        <SortableTableHead
                          label="Max"
                          columnKey="max"
                          sortConfig={sortConfig}
                          onSort={handleSort}
                          className="text-right"
                        />
                        <SortableTableHead
                          label="Status"
                          columnKey="status"
                          sortConfig={sortConfig}
                          onSort={handleSort}
                        />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProducts.map((produto) => {
                        const status = getStockStatus(produto);

                        return (
                          <TableRow
                            key={produto.id || `${produto.cod}-${produto.nome}`}
                          >
                            <TableCell className="font-medium text-muted-foreground">
                              <span className="block truncate" title={produto.cod || "-"}>
                                {produto.cod || "-"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div
                                className="truncate font-medium"
                                title={produto.nome || "-"}
                              >
                                {produto.nome || "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className="block truncate"
                                title={getInventoryCategory(produto)}
                              >
                                {getInventoryCategory(produto)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {Number(produto.estoque || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {Number(produto.min || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {Number(produto.max || 0)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`${status.className} max-w-full truncate`}
                              >
                                {status.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination
                  page={safeCurrentPage}
                  totalPages={totalPages}
                  totalItems={filteredProducts.length}
                  pageSize={pageSize}
                  itemLabel="produtos"
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(value) => {
                    setPageSize(value);
                    setCurrentPage(1);
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="hidden print:block print:bg-white print:text-black">
        {!printBlankSheet && filteredProducts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground print:border-black print:text-black">
            Nenhum produto encontrado para os filtros escolhidos.
          </div>
        ) : (
          printPages.map((pageRows, pageIndex) => (
            <div
              key={`print-page-${pageIndex}`}
              className="relative min-h-screen pb-32 print:bg-white"
              style={{
                breakAfter:
                  pageIndex < printPages.length - 1 ? "page" : "auto",
                pageBreakAfter:
                  pageIndex < printPages.length - 1 ? "always" : "auto",
              }}
            >
              <div className="mb-3 grid gap-3 border-b pb-3 print:grid-cols-[1fr_auto] print:items-start print:border-black">
                <div>
                  <h1 className="text-lg font-bold">
                    Relatorio de conferencia de estoque
                  </h1>
                  <p className="mt-1 text-sm text-black">
                    Categorias:{" "}
                    {printBlankSheet
                      ? "Preenchimento manual"
                      : selectedCategoryLabels}
                  </p>
                  <p className="text-sm text-black">
                    Produtos listados:{" "}
                    {printBlankSheet ? 0 : filteredProducts.length}
                  </p>
                  <p className="text-xs text-black">
                    Pagina {pageIndex + 1} de {printPages.length}
                  </p>
                </div>

                <div className="grid min-w-64 gap-1 text-sm">
                  <div className="grid grid-cols-[8rem_1fr] gap-2">
                    <span className="font-medium">Data:</span>
                    <span className="border-b border-black">
                      {formatDate(new Date())}
                    </span>
                  </div>
                  <div className="grid grid-cols-[8rem_1fr] gap-2">
                    <span className="font-medium">Periodo:</span>
                    <span className="border-b border-black">&nbsp;</span>
                  </div>
                  <div className="grid grid-cols-[8rem_1fr] gap-2">
                    <span className="font-medium">Responsavel:</span>
                    <span className="border-b border-black">&nbsp;</span>
                  </div>
                </div>
              </div>

              <Table className="table-fixed border-t border-black text-[9px]">
                <colgroup>
                  <col className="w-[17%]" />
                  <col className="w-[9%]" />
                  <col className="w-[40%]" />
                  <col className="w-[9%]" />
                  <col className="w-[10%]" />
                  <col className="w-[15%]" />
                </colgroup>
                <TableHeader>
                  <TableRow className="border-black hover:bg-transparent">
                    <TableHead className="border-b border-black px-1 py-1">
                      Categoria
                    </TableHead>
                    <TableHead className="border-b border-black px-1 py-1">
                      Cod
                    </TableHead>
                    <TableHead className="border-b border-black px-1 py-1">
                      Produto
                    </TableHead>
                    <TableHead className="border-b border-black px-1 py-1 text-right">
                      Estoque
                    </TableHead>
                    <TableHead className="border-b border-black px-1 py-1">
                      Estoque fisico
                    </TableHead>
                    <TableHead className="border-b border-black px-1 py-1">
                      Observacoes
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr:last-child]:border-b">
                  {pageRows.map((produto, rowIndex) => (
                    <TableRow
                      key={
                        produto.id ||
                        `${produto.cod}-${produto.nome}-${pageIndex}-${rowIndex}`
                      }
                      className="h-8 border-black hover:bg-transparent"
                    >
                      <TableCell className="border-b border-black px-1 py-1">
                        <span className="line-clamp-2">
                          {produto.empty
                            ? "\u00a0"
                            : getInventoryCategory(produto)}
                        </span>
                      </TableCell>
                      <TableCell className="border-b border-black px-1 py-1">
                        {produto.cod || "\u00a0"}
                      </TableCell>
                      <TableCell className="border-b border-black px-1 py-1">
                        <div className="line-clamp-2 font-medium">
                          {produto.nome || "\u00a0"}
                        </div>
                      </TableCell>
                      <TableCell className="border-b border-black px-1 py-1 text-right font-medium">
                        {produto.empty
                          ? "\u00a0"
                          : Number(produto.estoque || 0)}
                      </TableCell>
                      <TableCell className="border-b border-black px-1 py-1">
                        &nbsp;
                      </TableCell>
                      <TableCell className="border-b border-black px-1 py-1">
                        &nbsp;
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="absolute bottom-0 left-0 right-0 grid grid-cols-2 gap-8 bg-white pt-3 text-sm">
                <div>
                  <p className="mb-10 font-medium">Assinatura do responsavel</p>
                  <div className="border-b border-black" />
                </div>
                <div>
                  <p className="mb-10 font-medium">Conferencia/validacao</p>
                  <div className="border-b border-black" />
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
