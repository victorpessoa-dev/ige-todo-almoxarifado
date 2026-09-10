"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/notifications/toast";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleSlash,
  Clipboard,
  ClipboardCheck,
  History,
  ListPlus,
  PackageCheck,
  PackagePlus,
  Plus,
  RefreshCcw,
  Save,
  Settings2,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { useData } from "@/contexts/data-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import TablePagination from "@/components/ui/table-pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/ui/spinner";
import { PushNotificationToggle } from "@/components/push/PushNotificationToggle";
import {
  addPendenciasToSolicitacao,
  concluirRevisao,
  createSolicitacaoFromPendencias,
  deleteRotinaRevisao,
  listPendenciasReposicao,
  listRevisoesAbertas,
  listRotinasRevisao,
  moverRevisaoParaProximoDia,
  processarRotinasRevisao,
  replaceChecklistItems,
  saveRotinaRevisao,
  updateReviewItem,
} from "@/lib/services/revisoes-service";
import { getUserMessage } from "@/lib/messaging/user-messages";
import { sortReviewItems } from "@/lib/revisoes/priority";
import { getReviewCategories } from "@/lib/revisoes/categories";
import {
  getCompraQuantidade,
  getInventoryCategory,
  makeReposicaoBlocks,
  makeReposicaoLine,
  normalizeCategory,
} from "@/lib/inventory/replenishment";

const initialForm = {
  nome: "",
  tipo: "produtos",
  categoria: "",
  categorias: [],
  horario: "09:00",
  frequencia: "diaria",
  intervalo_dias: 1,
  dias_bloqueados: [0],
  foco: "inteligente",
  repetir_notificacao_minutos: 10,
  janela_revisao: 480,
  ativo: true,
};

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const REVIEWS_PAGE_SIZE = 25;
const ATTENTION_PREVIEW_LIMIT = 4;

function getPendenciaProduto(item) {
  return (
    item.produtos || {
      id: item.produto_id || null,
      cod: "",
      nome: item.nome_snapshot,
      categoria: "Sem categoria",
      estoque: 0,
      min: 0,
      max: 1,
    }
  );
}

function getPendenciaQuantidade(item) {
  return Math.max(1, getCompraQuantidade(getPendenciaProduto(item)) || 1);
}

function formatDate(value) {
  return value
    ? new Date(value).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "-";
}

function formatRelativeDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return `hoje as ${date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  if (date.toDateString() === tomorrow.toDateString()) {
    return `amanha as ${date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  return formatDate(value);
}

function getTotalPages(items) {
  return Math.max(1, Math.ceil(items.length / REVIEWS_PAGE_SIZE));
}

function paginateItems(items, page) {
  const start = (page - 1) * REVIEWS_PAGE_SIZE;
  return items.slice(start, start + REVIEWS_PAGE_SIZE);
}

function getStockState(product = {}, status = "") {
  const estoque = Number(product.estoque || 0);
  const minimo = Number(product.min || 0);

  if (status === "em_falta" || estoque <= 0) {
    return {
      key: "em_falta",
      label: "Em falta",
      rank: 0,
      badge: "border-destructive/20 bg-destructive/10 text-destructive",
    };
  }

  if (minimo > 0 && estoque <= Math.max(1, minimo * 0.5)) {
    return {
      key: "critico",
      label: "Critico",
      rank: 1,
      badge: "border-destructive/20 bg-destructive/10 text-destructive",
    };
  }

  if (minimo > 0 && estoque <= minimo) {
    return {
      key: "baixo",
      label: "Estoque baixo",
      rank: 2,
      badge: "border-amber-500/20 bg-amber-500/10 text-amber-600",
    };
  }

  if (status === "repor") {
    return {
      key: "reposicao",
      label: "Aguardando compra",
      rank: 3,
      badge: "border-blue-500/20 bg-blue-500/10 text-blue-600",
    };
  }

  return {
    key: "normal",
    label: "Normal",
    rank: 4,
    badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
  };
}

function isToday(value) {
  if (!value) return false;
  return new Date(value).toDateString() === new Date().toDateString();
}

function getReviewItems(review) {
  return review?.revisoes_estoque_itens || [];
}

function getReviewTitle(review) {
  return review?.rotinas_revisao?.nome || "Revisao de estoque";
}

function getRoutineProducts(routine, produtos) {
  if (routine.tipo !== "produtos") return [];
  const selectedCategories = new Set(
    getReviewCategories(routine).map((category) =>
      category.toLocaleLowerCase("pt-BR"),
    ),
  );
  return produtos.filter((product) =>
    selectedCategories.has(
      String(product.categoria || "")
        .trim()
        .toLocaleLowerCase("pt-BR"),
    ),
  );
}

function buildReviewIntel(review) {
  const items = getReviewItems(review);
  const pendingItems = sortReviewItems(
    items.filter((item) => item.status === "pendente"),
  );
  const checkedItems = items.filter((item) => item.status !== "pendente");
  const count = (key) =>
    items.filter((item) => getStockState(item.produtos, item.status).key === key)
      .length;
  const problemItems = pendingItems.filter((item) =>
    ["critico", "em_falta", "baixo"].includes(
      getStockState(item.produtos, item.status).key,
    ),
  );
  const delayedCount = Number(review.adiada_count || 0);

  return {
    review,
    items,
    pendingItems,
    checkedItems,
    problemItems,
    critical: count("critico"),
    missing: count("em_falta"),
    low: count("baixo"),
    normal: count("normal"),
    reposicao: count("reposicao"),
    delayedCount,
    score:
      count("em_falta") * 100 +
      count("critico") * 80 +
      count("baixo") * 40 +
      (review.status === "atrasada" ? 25 : 0) +
      delayedCount * 5 -
      new Date(review.agendada_para || Date.now()).getTime() / 100000000000,
  };
}

export default function RevisoesPage() {
  const {
    produtos,
    solicitacoesCompra,
    solicitantesCompra,
    centrosCusto,
    isLoaded,
  } = useData();
  const [rotinas, setRotinas] = useState([]);
  const [revisoes, setRevisoes] = useState([]);
  const [pendencias, setPendencias] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [checklist, setChecklist] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [routineDialogOpen, setRoutineDialogOpen] = useState(false);
  const [routineToDelete, setRoutineToDelete] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [selectedReviewItems, setSelectedReviewItems] = useState([]);
  const [selectedRoutineProducts, setSelectedRoutineProducts] = useState(null);
  const [selectedPendencias, setSelectedPendencias] = useState([]);
  const [targetSolicitacao, setTargetSolicitacao] = useState("nova");
  const [newList, setNewList] = useState({
    nome_lista: "",
    solicitante_id: "",
    centro_custo_id: "",
    prioridade: "alta",
  });
  const [pasteCategory, setPasteCategory] = useState("todas");
  const [loading, setLoading] = useState(true);
  const [rotinasPage, setRotinasPage] = useState(1);
  const [pendenciasPage, setPendenciasPage] = useState(1);
  const categories = useMemo(
    () => [...new Set(produtos.map((p) => p.categoria).filter(Boolean))].sort(),
    [produtos],
  );
  const activeSolicitantes = useMemo(
    () => solicitantesCompra.filter((item) => item.ativo !== false),
    [solicitantesCompra],
  );
  const activeCentrosCusto = useMemo(
    () => centrosCusto.filter((item) => item.ativo !== false),
    [centrosCusto],
  );
  const rotinasTotalPages = getTotalPages(rotinas);
  const pendenciasTotalPages = getTotalPages(pendencias);
  const safeRotinasPage = Math.min(rotinasPage, rotinasTotalPages);
  const safePendenciasPage = Math.min(pendenciasPage, pendenciasTotalPages);
  const paginatedRotinas = useMemo(
    () => paginateItems(rotinas, safeRotinasPage),
    [rotinas, safeRotinasPage],
  );
  const paginatedPendencias = useMemo(
    () => paginateItems(pendencias, safePendenciasPage),
    [pendencias, safePendenciasPage],
  );
  const reviewIntel = useMemo(
    () => revisoes.map(buildReviewIntel).sort((a, b) => b.score - a.score),
    [revisoes],
  );
  const attentionReviews = useMemo(
    () =>
      reviewIntel.filter(
        (intel) =>
          intel.problemItems.length > 0 ||
          intel.review.status === "atrasada" ||
          intel.delayedCount > 0,
      ),
    [reviewIntel],
  );

  const upcomingReviews = useMemo(() => {
    const openRoutineIds = new Set(revisoes.map((review) => review.rotina_id));
    const open = revisoes.map((review) => ({
      id: review.id,
      title: getReviewTitle(review),
      date: review.agendada_para,
      count: getReviewItems(review).filter((item) => item.status === "pendente")
        .length,
      status: review.status,
    }));
    const scheduled = rotinas
      .filter(
        (routine) =>
          routine.ativo !== false &&
          routine.proxima_execucao &&
          !openRoutineIds.has(routine.id),
      )
      .map((routine) => ({
        id: `rotina-${routine.id}`,
        title: routine.nome,
        date: routine.proxima_execucao,
        count:
          routine.tipo === "produtos"
            ? getRoutineProducts(routine, produtos).length
            : routine.itens_checklist_revisao?.length || 0,
        status: "agendada",
      }));

    return [...open, ...scheduled]
      .filter((item) => item.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 8);
  }, [revisoes, rotinas, produtos]);
  const recentHistory = useMemo(
    () =>
      reviewIntel
        .flatMap((intel) =>
          intel.checkedItems.map((item) => ({
            id: item.id,
            title: getReviewTitle(intel.review),
            item: item.nome_snapshot,
            status: item.status,
            date: item.revisado_em,
          })),
        )
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 6),
    [reviewIntel],
  );
  const selectedPendenciaItems = useMemo(
    () => pendencias.filter((item) => selectedPendencias.includes(item.id)),
    [pendencias, selectedPendencias],
  );
  const pendenciaGroups = useMemo(() => {
    const groups = new Map();

    paginatedPendencias.forEach((item) => {
      const category = getInventoryCategory(getPendenciaProduto(item));
      const key = normalizeCategory(category) || "sem-categoria";

      if (!groups.has(key)) groups.set(key, { key, category, items: [] });
      groups.get(key).items.push(item);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: group.items.sort((a, b) =>
          String(a.nome_snapshot || "").localeCompare(
            String(b.nome_snapshot || ""),
            "pt-BR",
          ),
        ),
      }))
      .sort((a, b) => a.category.localeCompare(b.category, "pt-BR"));
  }, [paginatedPendencias]);
  const selectedReposicaoBlocks = useMemo(
    () =>
      makeReposicaoBlocks(
        selectedPendenciaItems.map((item) => ({
          ...item,
          produto: getPendenciaProduto(item),
          quantidade: getPendenciaQuantidade(item),
        })),
        500,
      ),
    [selectedPendenciaItems],
  );
  const reposicaoListGroups = useMemo(() => {
    const groups = new Map();

    pendencias.forEach((item) => {
      const produto = getPendenciaProduto(item);
      const category = getInventoryCategory(produto);
      const key = normalizeCategory(category) || "sem-categoria";
      const line = makeReposicaoLine({
        produto,
        quantidade: getPendenciaQuantidade(item),
      });

      if (!groups.has(key)) groups.set(key, { key, category, lines: [] });
      groups.get(key).lines.push(line);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        lines: group.lines.sort((a, b) => a.localeCompare(b, "pt-BR")),
      }))
      .sort((a, b) => a.category.localeCompare(b.category, "pt-BR"));
  }, [pendencias]);
  const pasteListText = useMemo(() => {
    const groups =
      pasteCategory === "todas"
        ? reposicaoListGroups
        : reposicaoListGroups.filter((group) => group.key === pasteCategory);

    return groups
      .map((group) =>
        [group.category.toLocaleUpperCase("pt-BR"), ...group.lines].join("\n"),
      )
      .join("\n\n");
  }, [pasteCategory, reposicaoListGroups]);
  const selectedReviewPendingItems = useMemo(() => {
    if (!selectedReview) return [];
    return sortReviewItems(
      getReviewItems(selectedReview).filter((item) => item.status === "pendente"),
    );
  }, [selectedReview]);
  const selectedReviewSelectedItems = useMemo(
    () =>
      selectedReviewPendingItems.filter((item) =>
        selectedReviewItems.includes(item.id),
      ),
    [selectedReviewItems, selectedReviewPendingItems],
  );
  const selectedReviewProblemItems = useMemo(
    () =>
      selectedReviewPendingItems.filter((item) =>
        ["critico", "em_falta", "baixo"].includes(
          getStockState(item.produtos, item.status).key,
        ),
      ),
    [selectedReviewPendingItems],
  );
  const selectedReviewSummary = useMemo(
    () => (selectedReview ? buildReviewIntel(selectedReview) : null),
    [selectedReview],
  );
  const summary = useMemo(() => {
    const productStates = produtos.map((product) => getStockState(product));
    return {
      criticos: productStates.filter((state) => state.key === "critico").length,
      baixo: productStates.filter((state) => state.key === "baixo").length,
      emFalta: productStates.filter((state) => state.key === "em_falta").length,
      reposicao: pendencias.length,
      hoje: revisoes.filter((review) => isToday(review.agendada_para)).length,
    };
  }, [produtos, pendencias, revisoes]);

  const isLowStock = (product) =>
    Number(product.estoque || 0) <= Number(product.min || 0);

  const getCentroCustoLabel = (centroCusto) => {
    if (!centroCusto) return "";
    return [centroCusto.codigo, centroCusto.nome].filter(Boolean).join(" - ");
  };

  const getSolicitanteCentroCusto = (solicitante) => {
    if (!solicitante?.centro_custo_id) return null;
    return (
      activeCentrosCusto.find(
        (item) => item.id === solicitante.centro_custo_id,
      ) ||
      solicitante.centros_custo ||
      null
    );
  };

  const updateNewListField = (field, value) => {
    setNewList((prev) => {
      const nextForm = { ...prev, [field]: value };

      if (field === "solicitante_id") {
        const solicitante = activeSolicitantes.find(
          (item) => item.id === value,
        );
        const centroCusto = getSolicitanteCentroCusto(solicitante);
        if (centroCusto) nextForm.centro_custo_id = centroCusto.id;
      }

      return nextForm;
    });
  };

  const reload = async () => {
    setLoading(true);
    try {
      await processarRotinasRevisao();
      const [nextRotinas, nextRevisoes, nextPendencias] = await Promise.all([
        listRotinasRevisao(),
        listRevisoesAbertas(),
        listPendenciasReposicao(),
      ]);
      setRotinas(nextRotinas);
      setRevisoes(nextRevisoes);
      setPendencias(nextPendencias);
      setSelectedReview((current) => {
        const reviewId =
          new URLSearchParams(window.location.search).get("revisao") ||
          current?.id;
        return reviewId
          ? nextRevisoes.find((item) => item.id === reviewId) || null
          : null;
      });
    } catch (error) {
      toast.error(
        getUserMessage(error, "Nao foi possivel carregar as revisoes."),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded) reload();
  }, [isLoaded]);

  const updateForm = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const toggleBlockedDay = (day) =>
    updateForm(
      "dias_bloqueados",
      form.dias_bloqueados.includes(day)
        ? form.dias_bloqueados.filter((item) => item !== day)
        : [...form.dias_bloqueados, day],
    );
  const toggleCategory = (category) =>
    updateForm(
      "categorias",
      form.categorias.includes(category)
        ? form.categorias.filter((item) => item !== category)
        : [...form.categorias, category],
    );

  const resetForm = () => {
    setForm(initialForm);
    setChecklist([]);
    setEditingId(null);
  };

  const submitRoutine = async (event) => {
    event.preventDefault();
    try {
      const routine = await saveRotinaRevisao(form, editingId);
      if (form.tipo === "checklist") {
        await replaceChecklistItems(routine.id, checklist);
      }
      const cachedRoutine = {
        ...routine,
        itens_checklist_revisao:
          form.tipo === "checklist"
            ? checklist
            : routine.itens_checklist_revisao || [],
      };
      setRotinas((current) =>
        (editingId
          ? current.map((item) =>
              item.id === routine.id ? cachedRoutine : item,
            )
          : [...current, cachedRoutine]
        ).sort(
          (a, b) => new Date(a.proxima_execucao) - new Date(b.proxima_execucao),
        ),
      );
      toast.success(editingId ? "Rotina atualizada." : "Rotina criada.");
      resetForm();
      setRoutineDialogOpen(false);
    } catch (error) {
      toast.error(getUserMessage(error, "Nao foi possivel salvar a rotina."));
    }
  };

  const editRoutine = (routine) => {
    setEditingId(routine.id);
    setForm({
      ...initialForm,
      ...routine,
      categorias: getReviewCategories(routine),
      dias_bloqueados: routine.dias_bloqueados || [],
    });
    setChecklist(
      (routine.itens_checklist_revisao || []).sort((a, b) => a.ordem - b.ordem),
    );
    setRoutineDialogOpen(true);
  };

  const removeRoutine = async () => {
    if (!routineToDelete) return;
    try {
      await deleteRotinaRevisao(routineToDelete.id);
      setRotinas((current) =>
        current.filter((item) => item.id !== routineToDelete.id),
      );
      setRoutineToDelete(null);
      toast.success("Rotina excluida.");
    } catch (error) {
      toast.error(getUserMessage(error, "Nao foi possivel excluir a rotina."));
    }
  };

  const treatItem = async (item, status) => {
    try {
      await updateReviewItem(
        item.id,
        status,
        item.observacao,
        item.quantidade_contada,
      );
      const updatedItem = {
        ...item,
        status,
        revisado_em: new Date().toISOString(),
        quantidade_contada: item.quantidade_contada || null,
      };
      const updateReview = (review) =>
        review.id !== item.revisao_id
          ? review
          : {
              ...review,
              status: "em_andamento",
              revisoes_estoque_itens: review.revisoes_estoque_itens.map(
                (current) => (current.id === item.id ? updatedItem : current),
              ),
            };
      setSelectedReview((review) => (review ? updateReview(review) : review));
      setRevisoes((current) => current.map(updateReview));
      setSelectedReviewItems((current) =>
        current.filter((id) => id !== item.id),
      );

      if (["repor", "em_falta"].includes(status)) {
        setPendencias((current) =>
          current.some((pending) => pending.id === item.id)
            ? current.map((pending) =>
                pending.id === item.id ? updatedItem : pending,
              )
            : [
                {
                  ...updatedItem,
                  revisoes_estoque: {
                    id: selectedReview?.id,
                    status: selectedReview?.status,
                    rotinas_revisao: selectedReview?.rotinas_revisao,
                  },
                },
                ...current,
              ],
        );
      } else {
        setPendencias((current) =>
          current.filter((pending) => pending.id !== item.id),
        );
      }
    } catch (error) {
      toast.error(getUserMessage(error, "Nao foi possivel registrar o item."));
    }
  };

  const treatSelectedReviewItems = async (status) => {
    if (!selectedReviewSelectedItems.length) {
      toast.error("Selecione os produtos da revisao.");
      return;
    }

    for (const item of selectedReviewSelectedItems) {
      await treatItem(item, status);
    }

    toast.success(
      status === "repor"
        ? "Itens encaminhados para compra."
        : "Itens da revisao atualizados.",
    );
  };

  const moveReviewNextDay = async (review) => {
    try {
      const result = await moverRevisaoParaProximoDia(review.id);
      const next = result?.next || review.agendada_para;
      const updatedReview = {
        ...review,
        status: "pendente",
        agendada_para: next,
        notificar_em: next,
        adiada_ate: next,
        adiada_count:
          result?.adiadaCount ?? Number(review.adiada_count || 0) + 1,
      };
      setRevisoes((current) =>
        current.map((item) => (item.id === review.id ? updatedReview : item)),
      );
      setSelectedReview((current) =>
        current?.id === review.id ? updatedReview : current,
      );
      toast.success("Revisao movida para o proximo dia.");
    } catch (error) {
      toast.error(getUserMessage(error, "Nao foi possivel mover a revisao."));
    }
  };

  const finishReview = async (review) => {
    try {
      await concluirRevisao(review.id);
      setRevisoes((current) => current.filter((item) => item.id !== review.id));
      setSelectedReview(null);
      toast.success(
        "Revisao concluida. Pendencias de reposicao foram mantidas.",
      );
    } catch (error) {
      toast.error(
        getUserMessage(error, "Trate todos os itens antes de concluir."),
      );
    }
  };

  const togglePending = (id) =>
    setSelectedPendencias((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );

  const toggleReviewItem = (id) =>
    setSelectedReviewItems((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );

  const copyPasteList = async () => {
    if (!pasteListText) return toast.error("Nenhuma pendencia para copiar.");
    try {
      await navigator.clipboard.writeText(pasteListText);
      toast.success("Lista copiada.");
    } catch {
      toast.error("Nao foi possivel copiar a lista.");
    }
  };

  const movePendencias = async () => {
    const selected = pendencias.filter((item) =>
      selectedPendencias.includes(item.id),
    );
    if (!selected.length) {
      return toast.error("Selecione os itens para reposicao.");
    }
    try {
      if (targetSolicitacao === "nova") {
        await createSolicitacaoFromPendencias(newList, selected);
      } else {
        await addPendenciasToSolicitacao(targetSolicitacao, selected);
      }
      setPendencias((current) =>
        current.filter((item) => !selectedPendencias.includes(item.id)),
      );
      setSelectedPendencias([]);
      toast.success("Itens adicionados a solicitacao.");
    } catch (error) {
      toast.error(getUserMessage(error, "Nao foi possivel adicionar os itens."));
    }
  };

  if (!isLoaded || loading) return <LoadingState className="min-h-[60vh]" />;

  const allClear =
    attentionReviews.length === 0 &&
    summary.criticos === 0 &&
    summary.baixo === 0 &&
    summary.emFalta === 0;
  const nextReview = upcomingReviews[0];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-8">
      <header className="flex flex-col gap-4 rounded-lg border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            <ClipboardCheck className="text-primary" /> Revisoes de Estoque
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitore o que precisa de atencao no estoque.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          <PushNotificationToggle />
          <Button variant="outline" onClick={reload}>
            <RefreshCcw className="h-4 w-4" /> Atualizar
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              setRoutineDialogOpen(true);
            }}
          >
            <Settings2 className="h-4 w-4" /> Configuracoes de rotina
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: "Criticos",
            value: summary.criticos,
            icon: AlertCircle,
            tone: "border-t-destructive",
          },
          {
            label: "Estoque baixo",
            value: summary.baixo,
            icon: AlertTriangle,
            tone: "border-t-amber-500",
          },
          {
            label: "Em falta",
            value: summary.emFalta,
            icon: CircleSlash,
            tone: "border-t-destructive",
          },
          {
            label: "Aguardando compra",
            value: summary.reposicao,
            icon: ShoppingCart,
            tone: "border-t-blue-500",
          },
          {
            label: "Revisoes hoje",
            value: summary.hoje,
            icon: CalendarClock,
            tone: "border-t-primary",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className={`border-t-4 ${item.tone}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    {item.label}
                  </p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-3xl font-bold tabular-nums">
                  {item.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold uppercase tracking-wide">
              Atencao agora
            </h2>
            <p className="text-sm text-muted-foreground">
              Revisoes ordenadas por falta, criticidade, estoque baixo e atraso.
            </p>
          </div>
          {attentionReviews.length > 0 && (
            <Badge variant="secondary">
              {attentionReviews.length} revisao(oes) com prioridade
            </Badge>
          )}
        </div>

        {allClear ? (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-semibold">Tudo em ordem</p>
                  <p className="text-sm text-muted-foreground">
                    Nenhum produto requer atencao no momento.
                  </p>
                  {nextReview && (
                    <p className="mt-1 text-sm">
                      Proxima revisao: {nextReview.title}{" "}
                      {formatRelativeDate(nextReview.date)}.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {attentionReviews.map((intel) => (
              <Card
                key={intel.review.id}
                className="overflow-hidden border-destructive/20"
              >
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        {intel.review.status === "atrasada"
                          ? "Revisao atrasada"
                          : "Revisao aberta"}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold">
                        {getReviewTitle(intel.review)}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {intel.problemItems.length || intel.pendingItems.length}{" "}
                        produto(s) para atencao · ultima agenda:{" "}
                        {formatRelativeDate(intel.review.agendada_para)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {intel.critical > 0 && (
                        <Badge variant="destructive">
                          {intel.critical} critico(s)
                        </Badge>
                      )}
                      {intel.missing > 0 && (
                        <Badge variant="destructive">
                          {intel.missing} em falta
                        </Badge>
                      )}
                      {intel.low > 0 && (
                        <Badge className="bg-amber-500/10 text-amber-600">
                          {intel.low} baixo(s)
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="divide-y rounded-lg border">
                    {(intel.problemItems.length
                      ? intel.problemItems
                      : intel.pendingItems
                    )
                      .slice(0, ATTENTION_PREVIEW_LIMIT)
                      .map((item) => {
                        const state = getStockState(item.produtos, item.status);
                        return (
                          <div
                            key={item.id}
                            className="grid gap-2 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {item.nome_snapshot}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Estoque {item.produtos?.estoque ?? 0} / minimo{" "}
                                {item.produtos?.min ?? 0}
                              </p>
                            </div>
                            <Badge variant="outline" className={state.badge}>
                              {state.label}
                            </Badge>
                          </div>
                        );
                      })}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setSelectedReviewItems([]);
                        setSelectedReview(intel.review);
                      }}
                    >
                      <ArrowRight className="h-4 w-4" /> Revisar estoque
                    </Button>
                    <Button
                      className="w-full sm:w-auto"
                      variant="outline"
                      onClick={() => {
                        setSelectedReviewItems(
                          (intel.problemItems.length
                            ? intel.problemItems
                            : intel.pendingItems
                          ).map((item) => item.id),
                        );
                        setSelectedReview(intel.review);
                      }}
                    >
                      <ShoppingCart className="h-4 w-4" /> Solicitar compras
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {selectedReview && selectedReviewSummary && (
        <Card className="border-primary/40">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>
                  Revisar {getReviewTitle(selectedReview)}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedReviewSummary.items.length} produtos analisados ·{" "}
                  {selectedReviewPendingItems.length} pendente(s)
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => moveReviewNextDay(selectedReview)}
                >
                  <CalendarClock className="h-4 w-4" /> Adiar
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedReview(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["Criticos", selectedReviewSummary.critical],
                ["Estoque baixo", selectedReviewSummary.low],
                ["Em falta", selectedReviewSummary.missing],
                ["Normais", selectedReviewSummary.normal],
                ["Aguardando compra", selectedReviewSummary.reposicao],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    Fila de decisao da revisao
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedReviewItems.length} selecionado(s) de{" "}
                    {selectedReviewPendingItems.length} pendente(s)
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setSelectedReviewItems(
                        selectedReviewProblemItems.map((item) => item.id),
                      )
                    }
                    disabled={selectedReviewProblemItems.length === 0}
                  >
                    Criticos/baixos
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setSelectedReviewItems(
                        selectedReviewPendingItems.map((item) => item.id),
                      )
                    }
                    disabled={selectedReviewPendingItems.length === 0}
                  >
                    Todos pendentes
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedReviewItems([])}
                    disabled={selectedReviewItems.length === 0}
                  >
                    Limpar
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => treatSelectedReviewItems("ok")}
                  disabled={selectedReviewItems.length === 0}
                >
                  <Check className="h-4 w-4" /> Marcar OK
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => treatSelectedReviewItems("repor")}
                  disabled={selectedReviewItems.length === 0}
                >
                  <PackagePlus className="h-4 w-4" /> Enviar para compra
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => treatSelectedReviewItems("em_falta")}
                  disabled={selectedReviewItems.length === 0}
                >
                  <AlertTriangle className="h-4 w-4" /> Marcar falta
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => treatSelectedReviewItems("nao_verificado")}
                  disabled={selectedReviewItems.length === 0}
                >
                  <CircleSlash className="h-4 w-4" /> Adiar itens
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <div className="hidden grid-cols-[44px_minmax(0,1.5fr)_96px_96px_140px_300px] gap-3 border-b bg-muted/30 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground xl:grid">
                <span />
                <span>Produto</span>
                <span>Estoque</span>
                <span>Minimo</span>
                <span>Situacao</span>
                <span>Decisao</span>
              </div>
              {selectedReviewPendingItems.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Todos os itens desta revisao foram tratados. Feche a revisao
                  para liberar a proxima execucao.
                </div>
              ) : (
                selectedReviewPendingItems.map((item) => {
                  const state = getStockState(item.produtos, item.status);
                  return (
                    <div
                      key={item.id}
                      className="grid gap-3 border-b p-3 last:border-b-0 xl:grid-cols-[44px_minmax(0,1.5fr)_96px_96px_140px_300px] xl:items-center"
                    >
                      <Checkbox
                        checked={selectedReviewItems.includes(item.id)}
                        onCheckedChange={() => toggleReviewItem(item.id)}
                      />
                      <div className="min-w-0">
                        <p className="break-words font-medium">
                          {item.nome_snapshot}
                        </p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-[140px_1fr] xl:mt-3 xl:pr-4">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Qtd. contada"
                            value={item.quantidade_contada ?? ""}
                            onChange={(e) =>
                              setSelectedReview((review) => ({
                                ...review,
                                revisoes_estoque_itens:
                                  review.revisoes_estoque_itens.map(
                                    (current) =>
                                      current.id === item.id
                                        ? {
                                            ...current,
                                            quantidade_contada: e.target.value,
                                          }
                                        : current,
                                  ),
                              }))
                            }
                          />
                          <Textarea
                            placeholder="Observacao opcional"
                            value={item.observacao || ""}
                            onChange={(e) =>
                              setSelectedReview((review) => ({
                                ...review,
                                revisoes_estoque_itens:
                                  review.revisoes_estoque_itens.map(
                                    (current) =>
                                      current.id === item.id
                                        ? {
                                            ...current,
                                            observacao: e.target.value,
                                          }
                                        : current,
                                  ),
                              }))
                            }
                          />
                        </div>
                      </div>
                      <p className="text-sm tabular-nums">
                        <span className="text-muted-foreground lg:hidden">
                          Estoque:{" "}
                        </span>
                        {item.produtos?.estoque ?? 0}
                      </p>
                      <p className="text-sm tabular-nums">
                        <span className="text-muted-foreground lg:hidden">
                          Minimo:{" "}
                        </span>
                        {item.produtos?.min ?? 0}
                      </p>
                      <Badge variant="outline" className={state.badge}>
                        {state.label}
                      </Badge>
                      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:grid xl:grid-cols-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="justify-start"
                          onClick={() => treatItem(item, "ok")}
                        >
                          <Check className="h-4 w-4" /> OK
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="justify-start"
                          onClick={() => treatItem(item, "repor")}
                        >
                          <PackagePlus className="h-4 w-4" /> Compra
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="justify-start"
                          onClick={() => treatItem(item, "em_falta")}
                        >
                          <AlertTriangle className="h-4 w-4" /> Falta
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="justify-start"
                          onClick={() => treatItem(item, "nao_verificado")}
                        >
                          <CircleSlash className="h-4 w-4" /> Adiar
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex border-t pt-4 sm:justify-end">
              <Button
                className="w-full sm:w-auto"
                onClick={() => finishReview(selectedReview)}
              >
                <PackageCheck className="h-4 w-4" /> Fechar revisao
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" /> Proximas revisoes
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {upcomingReviews.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Nenhuma revisao futura encontrada.
              </p>
            ) : (
              upcomingReviews.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-2 p-4 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-center"
                >
                  <p className="text-sm font-medium">
                    {formatRelativeDate(item.date)}
                  </p>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.count} item(ns) · {item.status}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {isToday(item.date) ? "Hoje" : "Agenda"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Historico recente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {recentHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum item tratado nas revisoes abertas.
              </p>
            ) : (
              recentHistory.map((item) => (
                <div key={item.id} className="flex gap-3 text-sm">
                  {item.status === "ok" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {item.title} - {item.item}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.status} · {formatRelativeDate(item.date)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListPlus className="h-5 w-5" /> Aguardando compra
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Produtos retirados da revisao e prontos para solicitacao.
              </p>
            </div>
            {pendencias.length > 0 && (
              <Badge variant="secondary">
                {selectedPendencias.length}/{pendencias.length} selecionados
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          {pendencias.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum produto aguardando solicitacao de compra.
            </p>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
              <div className="space-y-3">
                {pendenciaGroups.map((group) => {
                  const selectedInGroup = group.items.filter((item) =>
                    selectedPendencias.includes(item.id),
                  ).length;
                  return (
                    <div
                      key={group.key}
                      className="overflow-hidden rounded-lg border bg-background"
                    >
                      <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-3 py-2">
                        <div className="min-w-0">
                          <p
                            className="truncate text-sm font-semibold"
                            title={group.category}
                          >
                            {group.category}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {selectedInGroup} de {group.items.length} item(ns)
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setSelectedPendencias((current) => {
                              const ids = group.items.map((item) => item.id);
                              const allSelected = ids.every((id) =>
                                current.includes(id),
                              );
                              return allSelected
                                ? current.filter((id) => !ids.includes(id))
                                : Array.from(new Set([...current, ...ids]));
                            })
                          }
                        >
                          {selectedInGroup === group.items.length
                            ? "Limpar"
                            : "Selecionar"}
                        </Button>
                      </div>
                      <div className="divide-y">
                        {group.items.map((item) => {
                          const produto = getPendenciaProduto(item);
                          const quantidade = getPendenciaQuantidade(item);
                          const state = getStockState(produto, item.status);
                          return (
                            <label
                              key={item.id}
                              className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 p-3 text-sm hover:bg-muted/40 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
                            >
                              <Checkbox
                                checked={selectedPendencias.includes(item.id)}
                                onCheckedChange={() => togglePending(item.id)}
                                className="mt-1"
                              />
                              <span className="min-w-0">
                                <span
                                  className="block break-words font-medium sm:truncate"
                                  title={item.nome_snapshot}
                                >
                                  {produto.cod
                                    ? `${produto.cod} - ${item.nome_snapshot}`
                                    : item.nome_snapshot}
                                </span>
                                <span className="block text-xs text-muted-foreground sm:text-sm">
                                  {item.revisoes_estoque?.rotinas_revisao
                                    ?.nome || "Revisao"}{" "}
                                  · Estoque: {produto.estoque || 0} | Min:{" "}
                                  {produto.min || 0} | Max: {produto.max || 0}
                                </span>
                              </span>
                              <span className="col-start-2 flex flex-wrap gap-2 sm:col-start-auto sm:flex-col sm:items-end">
                                <Badge variant="outline" className={state.badge}>
                                  {state.label}
                                </Badge>
                                <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold">
                                  Qtd: {quantidade}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <TablePagination
                  page={safePendenciasPage}
                  totalPages={pendenciasTotalPages}
                  totalItems={pendencias.length}
                  pageSize={REVIEWS_PAGE_SIZE}
                  itemLabel="pendencias"
                  onPageChange={setPendenciasPage}
                />
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Lista para copiar/colar</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={copyPasteList}
                      disabled={!pasteListText}
                    >
                      <Clipboard className="h-4 w-4" /> Copiar
                    </Button>
                  </div>
                  <Select value={pasteCategory} onValueChange={setPasteCategory}>
                    <SelectTrigger className="mt-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas categorias</SelectItem>
                      {reposicaoListGroups.map((group) => (
                        <SelectItem key={group.key} value={group.key}>
                          {group.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    className="mt-3 min-h-48 resize-y font-mono text-xs"
                    readOnly
                    value={pasteListText}
                    placeholder="Selecione uma categoria."
                  />
                </div>

                <div className="rounded-lg border bg-muted/20 p-3">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                    <div className="space-y-2">
                      <Label>Destino</Label>
                      <Select
                        value={targetSolicitacao}
                        onValueChange={setTargetSolicitacao}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nova">
                            Criar listas por categoria
                          </SelectItem>
                          {solicitacoesCompra.map((request) => (
                            <SelectItem key={request.id} value={request.id}>
                              {request.codigo || request.nome_item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {targetSolicitacao === "nova" && (
                      <>
                        <div className="space-y-2">
                          <Label>Listas que serao criadas</Label>
                          <div className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">
                            {selectedReposicaoBlocks.length === 0
                              ? "Selecione itens para ver as listas."
                              : selectedReposicaoBlocks.map((block) => (
                                  <div
                                    key={block.category}
                                    className="flex justify-between gap-3 py-1"
                                  >
                                    <span
                                      className="truncate"
                                      title={block.category}
                                    >
                                      {block.category}
                                    </span>
                                    <span className="shrink-0">
                                      {block.items.length} item(ns)
                                    </span>
                                  </div>
                                ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Solicitante</Label>
                          <Select
                            value={newList.solicitante_id || undefined}
                            onValueChange={(value) =>
                              updateNewListField("solicitante_id", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {activeSolicitantes.map((person) => (
                                <SelectItem key={person.id} value={person.id}>
                                  {person.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Centro de custo</Label>
                          <Select
                            value={newList.centro_custo_id || undefined}
                            onValueChange={(value) =>
                              updateNewListField("centro_custo_id", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {activeCentrosCusto.map((center) => (
                                <SelectItem key={center.id} value={center.id}>
                                  {getCentroCustoLabel(center)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                    <Button
                      className="w-full"
                      onClick={movePendencias}
                      disabled={selectedPendencias.length === 0}
                    >
                      <ShoppingCart className="h-4 w-4" />{" "}
                      {targetSolicitacao === "nova"
                        ? "Solicitar compra"
                        : "Adicionar a lista"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" /> Configuracoes de rotina
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Rotinas alimentam automaticamente as revisoes de estoque.
              </p>
            </div>
            <Dialog open={routineDialogOpen} onOpenChange={setRoutineDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    resetForm();
                    setRoutineDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" /> Criar rotina
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Editar rotina" : "Nova rotina de revisao"}
                  </DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={submitRoutine}
                  className="grid gap-4 md:grid-cols-2"
                >
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={form.nome}
                      onChange={(e) => updateForm("nome", e.target.value)}
                      placeholder="Ex.: Revisar Correias"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={form.tipo}
                      onValueChange={(value) => updateForm("tipo", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="produtos">
                          Produtos por categoria
                        </SelectItem>
                        <SelectItem value="checklist">
                          Checklist manual
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.tipo === "produtos" && (
                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label>Categorias</Label>
                        <span className="text-xs text-muted-foreground">
                          {form.categorias.length} selecionada
                          {form.categorias.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/20 p-3">
                        {categories.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Nenhuma categoria cadastrada.
                          </p>
                        ) : (
                          categories.map((category) => (
                            <Button
                              key={category}
                              type="button"
                              size="sm"
                              variant={
                                form.categorias.includes(category)
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() => toggleCategory(category)}
                            >
                              {category}
                            </Button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Horario</Label>
                    <Input
                      type="time"
                      min="08:00"
                      max="17:00"
                      value={form.horario}
                      onChange={(e) => updateForm("horario", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Frequencia</Label>
                    <Select
                      value={form.frequencia}
                      onValueChange={(value) => updateForm("frequencia", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diaria">Diaria</SelectItem>
                        <SelectItem value="intervalo_dias">
                          A cada X dias
                        </SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.frequencia === "intervalo_dias" && (
                    <div className="space-y-2">
                      <Label>Intervalo em dias</Label>
                      <Input
                        type="number"
                        min="1"
                        value={form.intervalo_dias}
                        onChange={(e) =>
                          updateForm("intervalo_dias", e.target.value)
                        }
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Foco</Label>
                    <Select
                      value={form.foco}
                      onValueChange={(value) => updateForm("foco", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inteligente">
                          Inteligente
                        </SelectItem>
                        <SelectItem value="estoque_baixo">
                          Estoque baixo
                        </SelectItem>
                        <SelectItem value="pendencias">Pendencias</SelectItem>
                        <SelectItem value="completa">Completa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Repetir notificacao (minutos)</Label>
                    <Input
                      type="number"
                      min="5"
                      value={form.repetir_notificacao_minutos}
                      onChange={(e) =>
                        updateForm(
                          "repetir_notificacao_minutos",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Janela de revisao (minutos)</Label>
                    <Input
                      type="number"
                      min="30"
                      value={form.janela_revisao}
                      onChange={(e) =>
                        updateForm("janela_revisao", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Dias bloqueados</Label>
                    <div className="flex flex-wrap gap-2">
                      {weekDays.map((day, index) => (
                        <Button
                          key={day}
                          type="button"
                          variant={
                            form.dias_bloqueados.includes(index)
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => toggleBlockedDay(index)}
                        >
                          {day}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={form.ativo}
                      onCheckedChange={(value) => updateForm("ativo", value)}
                    />
                    <Label>Rotina ativa</Label>
                  </div>
                  {form.tipo === "checklist" && (
                    <div className="space-y-3 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <Label>Itens do checklist</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setChecklist((items) => [
                              ...items,
                              { nome: "", descricao: "", ativo: true },
                            ])
                          }
                        >
                          <Plus className="h-4 w-4" /> Adicionar item
                        </Button>
                      </div>
                      {checklist.map((item, index) => (
                        <div
                          key={index}
                          className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto]"
                        >
                          <Input
                            value={item.nome}
                            placeholder="Nome"
                            onChange={(e) =>
                              setChecklist((items) =>
                                items.map((current, i) =>
                                  i === index
                                    ? { ...current, nome: e.target.value }
                                    : current,
                                ),
                              )
                            }
                          />
                          <Input
                            value={item.descricao || ""}
                            placeholder="Descricao opcional"
                            onChange={(e) =>
                              setChecklist((items) =>
                                items.map((current, i) =>
                                  i === index
                                    ? { ...current, descricao: e.target.value }
                                    : current,
                                ),
                              )
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setChecklist((items) =>
                                items.filter((_, i) => i !== index),
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end md:col-span-2">
                    <Button type="submit">
                      <Save className="h-4 w-4" />{" "}
                      {editingId ? "Salvar alteracoes" : "Criar rotina"}
                    </Button>
                    {editingId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4 sm:p-6">
          {rotinas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma rotina criada.
            </p>
          ) : (
            paginatedRotinas.map((routine) => {
              const routineProducts = getRoutineProducts(routine, produtos);
              const lowStockProducts = routineProducts.filter(isLowStock);
              return (
                <div
                  key={routine.id}
                  className="rounded-lg border p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold">{routine.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {routine.tipo === "produtos"
                          ? `${getReviewCategories(routine).join(", ")} · ${
                              routineProducts.length
                            } produtos${
                              lowStockProducts.length
                                ? ` · ${lowStockProducts.length} com estoque baixo`
                                : ""
                            }`
                          : `${
                              routine.itens_checklist_revisao?.length || 0
                            } itens`}{" "}
                        · {routine.horario?.slice(0, 5)} · proxima:{" "}
                        {formatDate(routine.proxima_execucao)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                      {routine.tipo === "produtos" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setSelectedRoutineProducts({
                              routine,
                              products: routineProducts,
                            })
                          }
                        >
                          <Boxes className="h-4 w-4" /> Ver itens
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editRoutine(routine)}
                      >
                        <Settings2 className="h-4 w-4" /> Editar
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setRoutineToDelete(routine)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <TablePagination
            page={safeRotinasPage}
            totalPages={rotinasTotalPages}
            totalItems={rotinas.length}
            pageSize={REVIEWS_PAGE_SIZE}
            itemLabel="rotinas"
            onPageChange={setRotinasPage}
          />
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(routineToDelete)}
        onOpenChange={(open) => !open && setRoutineToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir rotina?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao excluira a rotina &quot;{routineToDelete?.nome}&quot; e as
              revisoes abertas associadas. Nao e possivel desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={removeRoutine}
            >
              Excluir rotina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(selectedRoutineProducts)}
        onOpenChange={(open) => !open && setSelectedRoutineProducts(null)}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Itens de {selectedRoutineProducts?.routine.nome}
            </DialogTitle>
          </DialogHeader>
          {selectedRoutineProducts?.products.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum produto encontrado nesta categoria.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedRoutineProducts?.products.map((product) => {
                const state = getStockState(product);
                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{product.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        Codigo: {product.cod || "-"} · Estoque:{" "}
                        {product.estoque} · Minimo: {product.min}
                      </p>
                    </div>
                    <Badge variant="outline" className={state.badge}>
                      {state.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
