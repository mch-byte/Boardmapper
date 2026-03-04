import useProjectStore from '../../store/useProjectStore'
import Header from './Header'
import TabBar from './TabBar'
import ChipManager from '../chip-manager/ChipManager'
import BoardView from '../board-view/BoardView'
import DialogHost from '../shared/DialogHost'

export default function App() {
  const activeTab = useProjectStore((s) => s.activeTab)

  return (
    <div className="h-screen bg-board-bg text-gray-200 font-mono flex flex-col">
      <Header />
      <TabBar />
      <main className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'chips' && <ChipManager />}
        {activeTab === 'board' && <BoardView />}
      </main>
      <DialogHost />
    </div>
  )
}
