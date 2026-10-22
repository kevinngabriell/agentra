import { apiFetch, apiPath, withQuery } from "./client"

export interface ApiTask {
    task_id: string
    title: string
    notes: string | null
    due_date: string
    status: 'open' | 'done'
    completed_at: string | null
    customer_id: string | null
    policy_id: string | null
    claim_id: string | null
    customer_name: string | null
    policy_number: string | null
    claim_number: string | null
    /** Negative = overdue. */
    days_until_due: number
}

export interface TaskListResponse {
    items: ApiTask[]
    overdue_count: number
    today_count: number
}

export interface TaskListParams {
    status?: 'open' | 'done' | 'all'
    due?: 'overdue' | 'today' | 'week' | 'today_overdue'
    customer_id?: string
    policy_id?: string
    claim_id?: string
    limit?: number
}

export interface TaskInput {
    title: string
    due_date: string
    notes?: string
    customer_id?: string | null
    policy_id?: string | null
    claim_id?: string | null
}

export async function getTasks(token: string, params: TaskListParams = {}, signal?: AbortSignal): Promise<TaskListResponse> {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, String(v))
    return apiFetch<TaskListResponse>(withQuery('/tasks', qs), { token, signal })
}

export async function createTask(token: string, data: TaskInput): Promise<{ task_id: string }> {
    return apiFetch<{ task_id: string }>('/tasks', { method: 'POST', token, body: data, errorMessage: 'Gagal menyimpan tugas' })
}

export async function updateTask(token: string, id: string, data: TaskInput): Promise<void> {
    await apiFetch(apiPath`/tasks/${id}`, { method: 'PUT', token, body: data, errorMessage: 'Gagal menyimpan tugas' })
}

export async function setTaskDone(token: string, id: string, done: boolean): Promise<void> {
    await apiFetch(apiPath`/tasks/${id}/${done ? 'complete' : 'reopen'}`, { method: 'POST', token })
}

export async function deleteTask(token: string, id: string): Promise<void> {
    await apiFetch(apiPath`/tasks/${id}`, { method: 'DELETE', token, errorMessage: 'Gagal menghapus tugas' })
}
