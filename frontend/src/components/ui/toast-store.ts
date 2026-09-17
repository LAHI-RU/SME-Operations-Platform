type Toast = { id: number; message: string }
let current: Toast[] = []
let nextId = 0
const listeners = new Set<() => void>()
export const toastStore = {
  getSnapshot: () => current,
  subscribe: (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  dismiss(id: number) {
    current = current.filter((toast) => toast.id !== id)
    listeners.forEach((listener) => listener())
  },
  clear() {
    current = []
    listeners.forEach((listener) => listener())
  },
}
export function notifySuccess(message: string) {
  const id = ++nextId
  current = [...current.slice(-2), { id, message }]
  listeners.forEach((listener) => listener())
  return id
}
