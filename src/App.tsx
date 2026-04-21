import { Navigate, Route, Routes } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import TodayScreen from './screens/TodayScreen';
import HistoryScreen from './screens/HistoryScreen';
import ProgressScreen from './screens/ProgressScreen';
import SettingsScreen from './screens/SettingsScreen';

export default function App() {
  return (
    <div className="flex min-h-full flex-col">
      <main className="flex-1 overflow-y-auto pb-20">
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<TodayScreen />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="/progress" element={<ProgressScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
