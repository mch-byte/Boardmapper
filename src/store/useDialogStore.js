import { create } from 'zustand'

let nextDialogId = 1

const useDialogStore = create((set, get) => ({
  dialog: null,

  openDialog: (config) => new Promise((resolve) => {
    set({
      dialog: {
        id: nextDialogId++,
        type: config.type || 'confirm',
        title: config.title || 'Confirm',
        message: config.message || '',
        confirmLabel: config.confirmLabel || 'Confirm',
        cancelLabel: config.cancelLabel ?? 'Cancel',
        tone: config.tone || 'neutral',
        resolve,
      },
    })
  }),

  requestConfirm: (config) => get().openDialog({
    type: 'confirm',
    title: config?.title || 'Confirm',
    message: config?.message || 'Are you sure?',
    confirmLabel: config?.confirmLabel || 'Confirm',
    cancelLabel: config?.cancelLabel || 'Cancel',
    tone: config?.tone || 'danger',
  }),

  requestNotice: (config) => get().openDialog({
    type: 'notice',
    title: config?.title || 'Notice',
    message: config?.message || '',
    confirmLabel: config?.confirmLabel || 'OK',
    cancelLabel: null,
    tone: config?.tone || 'neutral',
  }),

  closeDialog: (result = false) => {
    const dialog = get().dialog
    if (dialog?.resolve) dialog.resolve(result)
    set({ dialog: null })
  },
}))

export default useDialogStore
