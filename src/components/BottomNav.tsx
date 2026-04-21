import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/today', icon: '🏋️', label: 'Today' },
  { to: '/history', icon: '📅', label: 'History' },
  { to: '/progress', icon: '📊', label: 'Progress' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 h-16 border-t border-slate-200 bg-white">
      <ul className="mx-auto flex h-full max-w-md items-stretch justify-around">
        {tabs.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                `flex h-full flex-col items-center justify-center gap-0.5 text-xs ${
                  isActive ? 'text-indigo-600' : 'text-slate-500'
                }`
              }
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
