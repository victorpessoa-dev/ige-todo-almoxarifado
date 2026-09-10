"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/notifications/toast";
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  Check,
  CircleSlash,
  Clipboard,
  ClipboardCheck,
  Clock3,
  ListPlus,
  PackagePlus,
  Play,
  Plus,
  Save,
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
<<<<<<< HEAD
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
const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const REVIEWS_PAGE_SIZE = 25;
=======
  nome: '', tipo: 'produtos', categoria: '', categorias: [], horario: '09:00', frequencia: 'diaria', intervalo_dias: 1,
  dias_bloqueados: [0], foco: 'inteligente', repetir_notificacao_minutos: 10, janela_revisao: 480, ativo: true
}
const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const REVIEWS_PAGE_SIZE = 25
>>>>>>> cf9bfd381ed01be019ac1b6239f1b3f515cbf074

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

function getTotalPages(items) {
  return Math.max(1, Math.ceil(items.length / REVIEWS_PAGE_SIZE));
}

function paginateItems(items, page) {
  const start = (page - 1) * REVIEWS_PAGE_SIZE;
  return items.slice(start, start + REVIEWS_PAGE_SIZE);
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
  const [revisoesPage, setRevisoesPage] = useState(1);
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
  const revisoesTotalPages = getTotalPages(revisoes);
  const pendenciasTotalPages = getTotalPages(pendencias);
  const safeRotinasPage = Math.min(rotinasPage, rotinasTotalPages);
  const safeRevisoesPage = Math.min(revisoesPage, revisoesTotalPages);
  const safePendenciasPage = Math.min(pendenciasPage, pendenciasTotalPages);
  const paginatedRotinas = useMemo(
    () => paginateItems(rotinas, safeRotinasPage),
    [rotinas, safeRotinasPage],
  );
  const paginatedRevisoes = useMemo(
    () => paginateItems(revisoes, safeRevisoesPage),
    [revisoes, safeRevisoesPage],
  );
  const paginatedPendencias = useMemo(
    () => paginateItems(pendencias, safePendenciasPage),
    [pendencias, safePendenciasPage],
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

  const getRoutineProducts = (routine) => {
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
  };

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
<<<<<<< HEAD
      toast.error(
        getUserMessage(error, "Não foi possível carregar as revisões."),
      );
    } finally {
      setLoading(false);
    }
  };
=======
      toast.error(getUserMessage(error, 'Não foi possível carregar as revisões.'))
    } finally { setLoading(false) }
  }
>>>>>>> cf9bfd381ed01be019ac1b6239f1b3f515cbf074

  useEffect(() => {
    if (isLoaded) reload();
  }, [isLoaded]);

  const summary = useMemo(
    () => ({
      pendentes: revisoes.filter((r) => r.status === "pendente").length,
      andamento: revisoes.filter((r) => r.status === "em_andamento").length,
      atrasadas: revisoes.filter((r) => r.status === "atrasada").length,
      emFalta: pendencias.filter((i) => i.status === "em_falta").length,
      reposicao: pendencias.length,
    }),
    [revisoes, pendencias],
  );

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
<<<<<<< HEAD
      const routine = await saveRotinaRevisao(form, editingId);
      if (form.tipo === "checklist")
        await replaceChecklistItems(routine.id, checklist);
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
      toast.error(getUserMessage(error, "Não foi possível salvar a rotina."));
    }
  };
=======
      const routine = await saveRotinaRevisao(form, editingId)
      if (form.tipo === 'checklist') await replaceChecklistItems(routine.id, checklist)
      const cachedRoutine = { ...routine, itens_checklist_revisao: form.tipo === 'checklist' ? checklist : routine.itens_checklist_revisao || [] }
      setRotinas((current) => (editingId ? current.map((item) => item.id === routine.id ? cachedRoutine : item) : [...current, cachedRoutine]).sort((a, b) => new Date(a.proxima_execucao) - new Date(b.proxima_execucao)))
      toast.success(editingId ? 'Rotina atualizada.' : 'Rotina criada.')
      resetForm(); setRoutineDialogOpen(false)
    } catch (error) { toast.error(getUserMessage(error, 'Não foi possível salvar a rotina.')) }
  }
>>>>>>> cf9bfd381ed01be019ac1b6239f1b3f515cbf074
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
<<<<<<< HEAD
      await deleteRotinaRevisao(routineToDelete.id);
      setRotinas((current) =>
        current.filter((item) => item.id !== routineToDelete.id),
      );
      setRoutineToDelete(null);
      toast.success("Rotina excluída.");
    } catch (error) {
      toast.error(getUserMessage(error, "Não foi possível excluir a rotina."));
    }
  };
=======
      await deleteRotinaRevisao(routineToDelete.id)
      setRotinas((current) => current.filter((item) => item.id !== routineToDelete.id))
      setRoutineToDelete(null)
      toast.success('Rotina excluída.')
    } catch (error) { toast.error(getUserMessage(error, 'Não foi possível excluir a rotina.')) }
  }
>>>>>>> cf9bfd381ed01be019ac1b6239f1b3f515cbf074
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
<<<<<<< HEAD
    } catch (error) {
      toast.error(getUserMessage(error, "Não foi possível registrar o item."));
    }
  };
=======
    } catch (error) { toast.error(getUserMessage(error, 'Não foi possível registrar o item.')) }
  }
>>>>>>> cf9bfd381ed01be019ac1b6239f1b3f515cbf074
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
<<<<<<< HEAD
      await concluirRevisao(review.id);
      setRevisoes((current) => current.filter((item) => item.id !== review.id));
      setSelectedReview(null);
      toast.success(
        "Revisão concluída. Pendências de reposição foram mantidas.",
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
  const copyPasteList = async () => {
    if (!pasteListText) return toast.error("Nenhuma pendencia para copiar.");
=======
      await concluirRevisao(review.id)
      setRevisoes((current) => current.filter((item) => item.id !== review.id))
      setSelectedReview(null)
      toast.success('Revisão concluída. Pendências de reposição foram mantidas.')
    } catch (error) { toast.error(getUserMessage(error, 'Trate todos os itens antes de concluir.')) }
  }
  const togglePending = (id) => setSelectedPendencias((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const copyPasteList = async () => {
    if (!pasteListText) return toast.error('Nenhuma pendencia para copiar.')
    try {
      await navigator.clipboard.writeText(pasteListText)
      toast.success('Lista copiada.')
    } catch {
      toast.error('Nao foi possivel copiar a lista.')
    }
  }
  const movePendencias = async () => {
    const selected = pendencias.filter((item) => selectedPendencias.includes(item.id))
    if (!selected.length) return toast.error('Selecione os itens para reposição.')
>>>>>>> cf9bfd381ed01be019ac1b6239f1b3f515cbf074
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
    if (!selected.length)
      return toast.error("Selecione os itens para reposição.");
    try {
      if (targetSolicitacao === "nova") {
        await createSolicitacaoFromPendencias(newList, selected);
      } else {
        await addPendenciasToSolicitacao(targetSolicitacao, selected);
      }
<<<<<<< HEAD
      setPendencias((current) =>
        current.filter((item) => !selectedPendencias.includes(item.id)),
      );
      setSelectedPendencias([]);
      toast.success("Itens adicionados à solicitação.");
    } catch (error) {
      toast.error(
        getUserMessage(error, "Não foi possível adicionar os itens."),
      );
    }
  };
=======
      setPendencias((current) => current.filter((item) => !selectedPendencias.includes(item.id)))
      setSelectedPendencias([])
      toast.success('Itens adicionados à solicitação.')
    } catch (error) { toast.error(getUserMessage(error, 'Não foi possível adicionar os itens.')) }
  }
>>>>>>> cf9bfd381ed01be019ac1b6239f1b3f515cbf074

  if (!isLoaded || loading) return <LoadingState className="min-h-[60vh]" />;

<<<<<<< HEAD
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-8">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            <ClipboardCheck className="text-primary" /> Revisões
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rotinas de conferência, pendências e reposição sem alterar o
            estoque.
          </p>
=======
  return <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-8">
    <header className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div><h1 className="flex items-center gap-3 text-2xl font-bold"><ClipboardCheck className="text-primary" /> Revisões</h1><p className="mt-1 text-sm text-muted-foreground">Rotinas de conferência, pendências e reposição sem alterar o estoque.</p></div>
      <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end"><PushNotificationToggle /><Button variant="outline" onClick={() => window.location.assign('/calendario')}><CalendarDays className="h-4 w-4" /> Calendário</Button><Button variant="outline" onClick={reload}><Clock3 className="h-4 w-4" /> Atualizar</Button></div></header>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[['Pendentes', summary.pendentes, 'border-t-amber-500'], ['Em andamento', summary.andamento, 'border-t-primary'], ['Atrasadas', summary.atrasadas, 'border-t-destructive'], ['Em falta', summary.emFalta, 'border-t-destructive'], ['Aguardando reposição', summary.reposicao, 'border-t-emerald-500']].map(([label, value, tone]) => <Card key={label} className={'border-t-4 ' + tone}><CardContent className="p-4"><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-bold tabular-nums">{value}</p></CardContent></Card>)}
    </div>

    <div className="flex flex-col gap-3 border-y py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Rotinas e revisões</h2><p className="text-sm text-muted-foreground">Crie rotinas e execute as conferências que já estão programadas.</p></div><Dialog open={routineDialogOpen} onOpenChange={setRoutineDialogOpen}><DialogTrigger asChild><Button className="w-full sm:w-auto" onClick={() => { resetForm(); setRoutineDialogOpen(true) }}><Plus className="h-4 w-4" /> Criar rotina</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{editingId ? 'Editar rotina' : 'Nova rotina de revisão'}</DialogTitle></DialogHeader><Card className="border-0 shadow-none"><CardContent className="px-0">
      <form onSubmit={submitRoutine} className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label>Nome</Label><Input value={form.nome} onChange={(e) => updateForm('nome', e.target.value)} placeholder="Ex.: Revisar Correias" required /></div>
        <div className="space-y-2"><Label>Tipo</Label><Select value={form.tipo} onValueChange={(value) => updateForm('tipo', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="produtos">Produtos por categoria</SelectItem><SelectItem value="checklist">Checklist manual</SelectItem></SelectContent></Select></div>
        {form.tipo === 'produtos' && <div className="space-y-2 md:col-span-2"><div className="flex items-center justify-between gap-3"><Label>Categorias</Label><span className="text-xs text-muted-foreground">{form.categorias.length} selecionada{form.categorias.length === 1 ? '' : 's'}</span></div><div className="flex flex-wrap gap-2 rounded-lg border bg-muted/20 p-3">{categories.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p> : categories.map((category) => <Button key={category} type="button" size="sm" variant={form.categorias.includes(category) ? 'default' : 'outline'} onClick={() => toggleCategory(category)}>{category}</Button>)}</div><p className="text-xs text-muted-foreground">Selecione uma ou mais categorias para incluir todos os produtos correspondentes na revisão.</p></div>}
        <div className="space-y-2"><Label>Horário</Label><Input type="time" value={form.horario} onChange={(e) => updateForm('horario', e.target.value)} /></div>
        <div className="space-y-2"><Label>Frequência</Label><Select value={form.frequencia} onValueChange={(value) => updateForm('frequencia', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="diaria">Diária</SelectItem><SelectItem value="intervalo_dias">A cada X dias</SelectItem><SelectItem value="semanal">Semanal</SelectItem></SelectContent></Select></div>
        {form.frequencia === 'intervalo_dias' && <div className="space-y-2"><Label>Intervalo em dias</Label><Input type="number" min="1" value={form.intervalo_dias} onChange={(e) => updateForm('intervalo_dias', e.target.value)} /></div>}
        <div className="space-y-2"><Label>Foco</Label><Select value={form.foco} onValueChange={(value) => updateForm('foco', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="inteligente">Inteligente (recomendado)</SelectItem><SelectItem value="estoque_baixo">Estoque baixo</SelectItem><SelectItem value="pendencias">Pendências</SelectItem><SelectItem value="completa">Completa</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><Label>Repetir notificação (minutos)</Label><Input type="number" min="5" value={form.repetir_notificacao_minutos} onChange={(e) => updateForm('repetir_notificacao_minutos', e.target.value)} /></div>
        <div className="space-y-2"><Label>Janela de revisão (minutos)</Label><Input type="number" min="30" value={form.janela_revisao} onChange={(e) => updateForm('janela_revisao', e.target.value)} /></div>
        <div className="space-y-2 md:col-span-2"><Label>Dias bloqueados</Label><div className="flex flex-wrap gap-2">{weekDays.map((day, index) => <Button key={day} type="button" variant={form.dias_bloqueados.includes(index) ? 'default' : 'outline'} size="sm" onClick={() => toggleBlockedDay(index)}>{day}</Button>)}</div></div>
        <div className="flex items-center gap-3"><Switch checked={form.ativo} onCheckedChange={(value) => updateForm('ativo', value)} /><Label>Rotina ativa</Label></div>
        {form.tipo === 'checklist' && <div className="space-y-3 md:col-span-2"><div className="flex items-center justify-between"><Label>Itens do checklist</Label><Button type="button" size="sm" variant="outline" onClick={() => setChecklist((items) => [...items, { nome: '', descricao: '', ativo: true }])}><Plus className="h-4 w-4" /> Adicionar item</Button></div>{checklist.map((item, index) => <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto]"><Input value={item.nome} placeholder="Nome" onChange={(e) => setChecklist((items) => items.map((current, i) => i === index ? { ...current, nome: e.target.value } : current))} /><Input value={item.descricao || ''} placeholder="Descrição opcional" onChange={(e) => setChecklist((items) => items.map((current, i) => i === index ? { ...current, descricao: e.target.value } : current))} /><Button type="button" variant="ghost" size="icon" onClick={() => setChecklist((items) => items.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}</div>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end md:col-span-2"><Button type="submit"><Save className="h-4 w-4" /> {editingId ? 'Salvar alterações' : 'Criar rotina'}</Button>{editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>}</div>
      </form>
    </CardContent></Card></DialogContent></Dialog></div>

    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"><Card><CardHeader className="border-b bg-muted/20"><CardTitle>Rotinas configuradas</CardTitle><p className="text-sm text-muted-foreground">Defina o que deve ser conferido e quando.</p></CardHeader><CardContent className="space-y-3">{rotinas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma rotina criada.</p> : paginatedRotinas.map((routine) => { const routineProducts = getRoutineProducts(routine); const lowStockProducts = routineProducts.filter(isLowStock); return <div key={routine.id} className="rounded-xl border p-4 transition-colors hover:bg-muted/40"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{routine.nome}</p><p className="text-sm text-muted-foreground">{routine.tipo === 'produtos' ? `${routine.categoria} · ${routineProducts.length} produtos${lowStockProducts.length ? ` · ${lowStockProducts.length} com estoque baixo` : ''}` : `${routine.itens_checklist_revisao?.length || 0} itens`} · {routine.horario?.slice(0, 5)} · próxima: {formatDate(routine.proxima_execucao)}</p></div><div className="flex shrink-0 flex-wrap justify-end gap-1">{routine.tipo === 'produtos' && <Button size="sm" variant="outline" onClick={() => setSelectedRoutineProducts({ routine, products: routineProducts })}>Ver itens</Button>}<Button size="sm" variant="outline" onClick={() => editRoutine(routine)}>Editar</Button><Button size="icon" variant="ghost" onClick={() => setRoutineToDelete(routine)}><Trash2 className="h-4 w-4" /></Button></div></div></div> })}<TablePagination page={safeRotinasPage} totalPages={rotinasTotalPages} totalItems={rotinas.length} pageSize={REVIEWS_PAGE_SIZE} itemLabel="rotinas" onPageChange={setRotinasPage} /></CardContent></Card>
      <Card className="border-primary/30"><CardHeader className="border-b bg-primary/5"><CardTitle>Revisões para realizar</CardTitle><p className="text-sm text-muted-foreground">Comece por pendências e retome o que ficou em andamento.</p></CardHeader><CardContent className="space-y-3">{revisoes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma revisão pendente.</p> : paginatedRevisoes.map((review) => { const items = review.revisoes_estoque_itens || []; const done = items.filter((item) => item.status !== 'pendente').length; return <div key={review.id} className="rounded-xl border p-4 transition-colors hover:bg-muted/40"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{review.rotinas_revisao?.nome}</p><p className="text-sm text-muted-foreground">{review.status} · {done}/{items.length} tratados · {formatDate(review.agendada_para)}</p>{Number(review.adiada_count || 0) >= 3 && <Badge variant="destructive" className="mt-2 w-fit"><AlertCircle className="h-3 w-3" /> {review.adiada_count} adiamentos</Badge>}</div><div className="flex shrink-0 flex-col gap-2 sm:flex-row"><Button className="w-full sm:w-auto" size="sm" variant="outline" onClick={() => moveReviewNextDay(review)}><CalendarDays className="h-4 w-4" /> Proximo dia</Button><Button className="w-full sm:w-auto" size="sm" onClick={() => setSelectedReview(review)}><Play className="h-4 w-4" /> {review.status === 'em_andamento' ? 'Continuar' : 'Revisar'}</Button></div></div></div>})}<TablePagination page={safeRevisoesPage} totalPages={revisoesTotalPages} totalItems={revisoes.length} pageSize={REVIEWS_PAGE_SIZE} itemLabel="revisoes" onPageChange={setRevisoesPage} /></CardContent></Card></section>

    {selectedReview && (() => {
      const items = selectedReview.revisoes_estoque_itens || []
      const pendingItems = sortReviewItems(items.filter((item) => item.status === 'pendente'))
      const done = items.length - pendingItems.length

      return <Card className="border-primary/40"><CardHeader><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Revisar {selectedReview.rotinas_revisao?.nome}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{done}/{items.length} tratados. Itens marcados saem desta revisao atual.</p>{Number(selectedReview.adiada_count || 0) >= 3 && <Badge variant="destructive" className="mt-2 w-fit"><AlertCircle className="h-3 w-3" /> {selectedReview.adiada_count} adiamentos</Badge>}</div><div className="flex shrink-0 gap-2"><Button variant="outline" size="sm" onClick={() => moveReviewNextDay(selectedReview)}><CalendarDays className="h-4 w-4" /> Proximo dia</Button><Button variant="ghost" size="icon" onClick={() => setSelectedReview(null)}><X className="h-4 w-4" /></Button></div></div></CardHeader><CardContent className="space-y-3">{pendingItems.length === 0 ? <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">Todos os itens desta revisao foram tratados. Conclua para liberar a proxima execucao.</div> : pendingItems.map((item) => <div key={item.id} className="rounded-xl border p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="min-w-0"><p className="break-words font-semibold">{item.nome_snapshot}</p>{item.produtos && <p className="text-sm text-muted-foreground">Estoque: {item.produtos.estoque} · mínimo: {item.produtos.min}</p>}<p className="mt-1 text-xs uppercase text-muted-foreground">PENDENTE</p></div><div className="flex shrink-0 flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => treatItem(item, 'ok')}><Check className="h-4 w-4" /> OK</Button><Button size="sm" variant="outline" onClick={() => treatItem(item, 'repor')}><PackagePlus className="h-4 w-4" /> Repor</Button><Button size="sm" variant="outline" onClick={() => treatItem(item, 'nao_verificado')}><CircleSlash className="h-4 w-4" /> Nao verificado</Button><Button size="sm" variant="destructive" onClick={() => treatItem(item, 'em_falta')}><AlertTriangle className="h-4 w-4" /> Em falta</Button></div></div><div className="mt-3 grid gap-2 sm:grid-cols-[160px_1fr]"><Input type="number" min="0" step="0.01" placeholder="Qtd. contada" value={item.quantidade_contada ?? ''} onChange={(e) => setSelectedReview((review) => ({ ...review, revisoes_estoque_itens: review.revisoes_estoque_itens.map((current) => current.id === item.id ? { ...current, quantidade_contada: e.target.value } : current) }))} /><Textarea placeholder="Observacao opcional" value={item.observacao || ''} onChange={(e) => setSelectedReview((review) => ({ ...review, revisoes_estoque_itens: review.revisoes_estoque_itens.map((current) => current.id === item.id ? { ...current, observacao: e.target.value } : current) }))} /></div></div>)}<div className="flex border-t pt-4 sm:justify-end"><Button className="w-full sm:w-auto" onClick={() => finishReview(selectedReview)}>Concluir revisao</Button></div></CardContent></Card>
    })()}

    <AlertDialog open={Boolean(routineToDelete)} onOpenChange={(open) => !open && setRoutineToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir rotina?</AlertDialogTitle><AlertDialogDescription>Esta ação excluirá a rotina “{routineToDelete?.nome}” e as revisões abertas associadas. Não é possível desfazer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={removeRoutine}>Excluir rotina</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

    <Dialog open={Boolean(selectedRoutineProducts)} onOpenChange={(open) => !open && setSelectedRoutineProducts(null)}><DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Itens de {selectedRoutineProducts?.routine.nome}</DialogTitle></DialogHeader>{selectedRoutineProducts?.products.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum produto encontrado nesta categoria.</p> : <div className="space-y-2">{selectedRoutineProducts?.products.map((product) => { const lowStock = isLowStock(product); return <div key={product.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">{product.nome}</p><p className="text-sm text-muted-foreground">Código: {product.cod || '-'} · Estoque: {product.estoque} · Mínimo: {product.min}</p></div>{lowStock && <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">Estoque baixo</span>}</div> })}</div>}</DialogContent></Dialog>
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><ListPlus className="h-5 w-5" /> Aguardando reposicao</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Pendencias agrupadas por categoria para conferencia e compra.</p>
          </div>
          {pendencias.length > 0 && <Badge variant="secondary">{selectedPendencias.length}/{pendencias.length} selecionados</Badge>}
>>>>>>> cf9bfd381ed01be019ac1b6239f1b3f515cbf074
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          <PushNotificationToggle />
          <Button
            variant="outline"
            onClick={() => window.location.assign("/calendario")}
          >
            <CalendarDays className="h-4 w-4" /> Calendário
          </Button>
          <Button variant="outline" onClick={reload}>
            <Clock3 className="h-4 w-4" /> Atualizar
          </Button>
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Pendentes", summary.pendentes, "border-t-amber-500"],
          ["Em andamento", summary.andamento, "border-t-primary"],
          ["Atrasadas", summary.atrasadas, "border-t-destructive"],
          ["Em falta", summary.emFalta, "border-t-destructive"],
          ["Aguardando reposição", summary.reposicao, "border-t-emerald-500"],
        ].map(([label, value, tone]) => (
          <Card key={label} className={"border-t-4 " + tone}>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-col gap-3 border-y py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Rotinas e revisões</h2>
          <p className="text-sm text-muted-foreground">
            Crie rotinas e execute as conferências que já estão programadas.
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
                {editingId ? "Editar rotina" : "Nova rotina de revisão"}
              </DialogTitle>
            </DialogHeader>
            <Card className="border-0 shadow-none">
              <CardContent className="px-0">
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
                      <p className="text-xs text-muted-foreground">
                        Selecione uma ou mais categorias para incluir todos os
                        produtos correspondentes na revisão.
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Horário</Label>
                    <Input
                      type="time"
                      value={form.horario}
                      onChange={(e) => updateForm("horario", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Frequência</Label>
                    <Select
                      value={form.frequencia}
                      onValueChange={(value) => updateForm("frequencia", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diaria">Diária</SelectItem>
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
                          Inteligente (recomendado)
                        </SelectItem>
                        <SelectItem value="estoque_baixo">
                          Estoque baixo
                        </SelectItem>
                        <SelectItem value="pendencias">Pendências</SelectItem>
                        <SelectItem value="completa">Completa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Repetir notificação (minutos)</Label>
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
                    <Label>Janela de revisão (minutos)</Label>
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
                            placeholder="Descrição opcional"
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
                      {editingId ? "Salvar alterações" : "Criar rotina"}
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
              </CardContent>
            </Card>
          </DialogContent>
        </Dialog>
      </div>
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Card>
          <CardHeader className="border-b bg-muted/20">
            <CardTitle>Rotinas configuradas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Defina o que deve ser conferido e quando.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {rotinas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma rotina criada.
              </p>
            ) : (
              paginatedRotinas.map((routine) => {
                const routineProducts = getRoutineProducts(routine);
                const lowStockProducts = routineProducts.filter(isLowStock);
                return (
                  <div
                    key={routine.id}
                    className="rounded-xl border p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{routine.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {routine.tipo === "produtos"
                            ? `${routine.categoria} · ${routineProducts.length} produtos${lowStockProducts.length ? ` · ${lowStockProducts.length} com estoque baixo` : ""}`
                            : `${routine.itens_checklist_revisao?.length || 0} itens`}{" "}
                          · {routine.horario?.slice(0, 5)} · próxima:{" "}
                          {formatDate(routine.proxima_execucao)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1">
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
                            Ver itens
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => editRoutine(routine)}
                        >
                          Editar
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
        <Card className="border-primary/30">
          <CardHeader className="border-b bg-primary/5">
            <CardTitle>Revisões para realizar</CardTitle>
            <p className="text-sm text-muted-foreground">
              Comece por pendências e retome o que ficou em andamento.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {revisoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma revisão pendente.
              </p>
            ) : (
              paginatedRevisoes.map((review) => {
                const items = review.revisoes_estoque_itens || [];
                const done = items.filter(
                  (item) => item.status !== "pendente",
                ).length;
                return (
                  <div
                    key={review.id}
                    className="rounded-xl border p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold">
                          {review.rotinas_revisao?.nome}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {review.status} · {done}/{items.length} tratados ·{" "}
                          {formatDate(review.agendada_para)}
                        </p>
                        {Number(review.adiada_count || 0) >= 3 && (
                          <Badge variant="destructive" className="mt-2 w-fit">
                            <AlertCircle className="h-3 w-3" />{" "}
                            {review.adiada_count} adiamentos
                          </Badge>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                        <Button
                          className="w-full sm:w-auto"
                          size="sm"
                          variant="outline"
                          onClick={() => moveReviewNextDay(review)}
                        >
                          <CalendarDays className="h-4 w-4" /> Proximo dia
                        </Button>
                        <Button
                          className="w-full sm:w-auto"
                          size="sm"
                          onClick={() => setSelectedReview(review)}
                        >
                          <Play className="h-4 w-4" />{" "}
                          {review.status === "em_andamento"
                            ? "Continuar"
                            : "Revisar"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <TablePagination
              page={safeRevisoesPage}
              totalPages={revisoesTotalPages}
              totalItems={revisoes.length}
              pageSize={REVIEWS_PAGE_SIZE}
              itemLabel="revisoes"
              onPageChange={setRevisoesPage}
            />
          </CardContent>
        </Card>
      </section>
      {selectedReview &&
        (() => {
          const items = selectedReview.revisoes_estoque_itens || [];
          const pendingItems = sortReviewItems(
            items.filter((item) => item.status === "pendente"),
          );
          const done = items.length - pendingItems.length;

          return (
            <Card className="border-primary/40">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>
                      Revisar {selectedReview.rotinas_revisao?.nome}
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {done}/{items.length} tratados. Itens marcados saem desta
                      revisao atual.
                    </p>
                    {Number(selectedReview.adiada_count || 0) >= 3 && (
                      <Badge variant="destructive" className="mt-2 w-fit">
                        <AlertCircle className="h-3 w-3" />{" "}
                        {selectedReview.adiada_count} adiamentos
                      </Badge>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveReviewNextDay(selectedReview)}
                    >
                      <CalendarDays className="h-4 w-4" /> Proximo dia
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
              <CardContent className="space-y-3">
                {pendingItems.length === 0 ? (
                  <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                    Todos os itens desta revisao foram tratados. Conclua para
                    liberar a proxima execucao.
                  </div>
                ) : (
                  pendingItems.map((item) => (
                    <div key={item.id} className="rounded-xl border p-4">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div className="min-w-0">
                          <p className="break-words font-semibold">
                            {item.nome_snapshot}
                          </p>
                          {item.produtos && (
                            <p className="text-sm text-muted-foreground">
                              Estoque: {item.produtos.estoque} · mínimo:{" "}
                              {item.produtos.min}
                            </p>
                          )}
                          <p className="mt-1 text-xs uppercase text-muted-foreground">
                            PENDENTE
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => treatItem(item, "ok")}
                          >
                            <Check className="h-4 w-4" /> OK
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => treatItem(item, "repor")}
                          >
                            <PackagePlus className="h-4 w-4" /> Repor
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => treatItem(item, "nao_verificado")}
                          >
                            <CircleSlash className="h-4 w-4" /> Nao verificado
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => treatItem(item, "em_falta")}
                          >
                            <AlertTriangle className="h-4 w-4" /> Em falta
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-[160px_1fr]">
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
                                review.revisoes_estoque_itens.map((current) =>
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
                                review.revisoes_estoque_itens.map((current) =>
                                  current.id === item.id
                                    ? { ...current, observacao: e.target.value }
                                    : current,
                                ),
                            }))
                          }
                        />
                      </div>
                    </div>
                  ))
                )}
                <div className="flex border-t pt-4 sm:justify-end">
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => finishReview(selectedReview)}
                  >
                    Concluir revisao
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })()}
      <AlertDialog
        open={Boolean(routineToDelete)}
        onOpenChange={(open) => !open && setRoutineToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir rotina?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá a rotina “{routineToDelete?.nome}” e as
              revisões abertas associadas. Não é possível desfazer.
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
                const lowStock = isLowStock(product);
                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{product.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        Código: {product.cod || "-"} · Estoque:{" "}
                        {product.estoque} · Mínimo: {product.min}
                      </p>
                    </div>
                    {lowStock && (
                      <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
                        Estoque baixo
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListPlus className="h-5 w-5" /> Aguardando reposicao
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Pendencias agrupadas por categoria para conferencia e compra.
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
              Nenhum item aguardando inclusao em solicitacao.
            </p>
          ) : (
            <>
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
                                      ? produto.cod + " - " + item.nome_snapshot
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
                                  <Badge
                                    variant={
                                      item.status === "em_falta"
                                        ? "destructive"
                                        : "outline"
                                    }
                                  >
                                    {item.status === "em_falta"
                                      ? "EM FALTA"
                                      : "REPOR"}
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
                    <Select
                      value={pasteCategory}
                      onValueChange={setPasteCategory}
                    >
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
            </>
          )}
        </CardContent>
      </Card>{" "}
    </div>
  );
}
