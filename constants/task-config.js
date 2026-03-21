export const PRIORIDADE_OPTIONS = [
    {
        value: 'urgente',
        label: 'Urgente',
        color: 'bg-red-200 text-red-800',
        outline: 'outline-red-600'
    },
    {
        value: 'alto',
        label: 'Alto',
        color: 'bg-orange-200 text-orange-800',
        outline: 'outline-orange-500'
    },
    {
        value: 'medio',
        label: 'Médio',
        color: 'bg-yellow-200 text-yellow-800',
        outline: 'outline-yellow-500'
    },
    {
        value: 'baixo',
        label: 'Baixo',
        color: 'bg-green-200 text-green-800',
        outline: 'outline-green-500'
    }
]

export const STATUS_OPTIONS = [
    {
        value: 'a_fazer',
        label: 'A Fazer',
        color: 'border-gray-400 text-gray-600'
    },
    {
        value: 'em_andamento',
        label: 'Em Andamento',
        color: 'border-blue-500 text-blue-600'
    },
    {
        value: 'concluido',
        label: 'Concluído',
        color: 'border-green-600 text-green-700'
    }
]

export function sortByPriority(items) {
    const order = {
        urgente: 0,
        alto: 1,
        medio: 2,
        baixo: 3
    }

    return [...items].sort((a, b) => {
        return (order[a.prioridade] ?? 99) - (order[b.prioridade] ?? 99)
    })
}