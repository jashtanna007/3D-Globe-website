import './App.css'
import GlobeScene from './components/Globe'
import Overlay from './components/Overlay'
import { NewsProvider } from './store/newsStore'
import { useNewsData } from './hooks/useNewsData'

function AppContent() {
  const { refresh } = useNewsData()

  return (
    <div className="w-screen h-screen overflow-hidden bg-black relative">
      <Overlay onRefresh={refresh} />
      <GlobeScene />
    </div>
  )
}

function App() {
  return (
    <NewsProvider>
      <AppContent />
    </NewsProvider>
  )
}

export default App
