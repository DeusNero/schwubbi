import { Routes, Route } from 'react-router-dom'
import HomeScreen from './components/HomeScreen'
import GameScreen from './components/GameScreen'
import Leaderboard from './components/Leaderboard'
import BackupRestore from './components/BackupRestore'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/play" element={<GameScreen />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/backup" element={<BackupRestore />} />
    </Routes>
  )
}
