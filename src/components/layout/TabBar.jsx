import { Cpu, Layout } from 'lucide-react'
import useProjectStore from '../../store/useProjectStore'

const tabs = [
  { id: 'chips', label: 'Chip Manager', icon: Cpu },
  { id: 'board', label: 'Board View', icon: Layout },
]

export default function TabBar() {
  const activeTab = useProjectStore((s) => s.activeTab)
  const setActiveTab = useProjectStore((s) => s.setActiveTab)

  return (
    <div className="flex border-b border-board-border">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-5 py-2.5 text-xs font-medium transition-colors
              ${isActive
                ? 'text-board-accent border-b-2 border-board-accent bg-board-accent/5'
                : 'text-gray-500 hover:text-gray-300 border-b-2 border-transparent'
              }
            `}
          >
            <Icon size={14} />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
