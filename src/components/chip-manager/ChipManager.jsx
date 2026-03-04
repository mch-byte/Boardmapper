import useProjectStore from '../../store/useProjectStore'
import ChipList from './ChipList'
import ChipEditor from './ChipEditor'

export default function ChipManager() {
  const activeChipId = useProjectStore((s) => s.activeChipId)

  return (
    <div className="flex h-full">
      <ChipList />
      <div className="flex-1 overflow-auto">
        {activeChipId ? (
          <ChipEditor />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Add a chip to get started, or load a project
          </div>
        )}
      </div>
    </div>
  )
}
