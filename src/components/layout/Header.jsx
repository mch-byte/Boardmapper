import { useRef } from 'react'
import { Download, FolderOpen, Trash2 } from 'lucide-react'
import useProjectStore from '../../store/useProjectStore'
import useDialogStore from '../../store/useDialogStore'

export default function Header() {
  const project = useProjectStore((s) => s.project)
  const setProjectName = useProjectStore((s) => s.setProjectName)
  const exportProject = useProjectStore((s) => s.exportProject)
  const importProject = useProjectStore((s) => s.importProject)
  const resetProject = useProjectStore((s) => s.resetProject)
  const requestConfirm = useDialogStore((s) => s.requestConfirm)
  const requestNotice = useDialogStore((s) => s.requestNotice)
  const fileInputRef = useRef(null)

  const handleExport = () => {
    const json = exportProject()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}.boardmapper.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const success = importProject(ev.target.result)
      if (!success) {
        await requestNotice({
          title: 'Import failed',
          message: 'Failed to import project file.',
          confirmLabel: 'OK',
          tone: 'danger',
        })
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleResetProject = async () => {
    const confirmed = await requestConfirm({
      title: 'Reset project',
      message: 'All unsaved work will be lost.',
      confirmLabel: 'Reset',
      cancelLabel: 'Cancel',
      tone: 'danger',
    })
    if (confirmed) resetProject()
  }

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-board-border">
      <div className="flex items-center gap-4">
        <h1 className="text-board-accent font-bold tracking-widest text-sm uppercase">
          BoardMapper
        </h1>
        <input
          type="text"
          value={project.name}
          onChange={(e) => setProjectName(e.target.value)}
          className="bg-transparent border border-transparent hover:border-board-border focus:border-board-accent rounded px-2 py-1 text-sm text-gray-300 outline-none transition-colors"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-400 border border-emerald-400/30 rounded hover:bg-emerald-400/10 transition-colors"
          title="Save project"
        >
          <Download size={14} />
          Save
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-400 border border-blue-400/30 rounded hover:bg-blue-400/10 transition-colors"
          title="Load project"
        >
          <FolderOpen size={14} />
          Load
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />

        <button
          onClick={handleResetProject}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 border border-red-400/30 rounded hover:bg-red-400/10 transition-colors"
          title="New project"
        >
          <Trash2 size={14} />
          New
        </button>
      </div>
    </header>
  )
}
