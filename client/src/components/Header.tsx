import { AsanaUser } from '../types';
import { formatRelativeDate } from '../utils/formatDate';

interface Props {
  user: AsanaUser | null;
  onRefresh: () => void;
  lastFetched: string | null;
}

const Header = ({ user, onRefresh, lastFetched }: Props) => {
  const handleLogout = async () => {
    await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    window.location.href = '/login';
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="w-[90%] mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="https://www.rian.io/icons/rian-logo.svg"
            alt="Rian"
            width="32"
            height="32"
          />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Rian Dashboard</h1>
            {lastFetched && (
              <p className="text-xs text-gray-500">
                Last updated: {formatRelativeDate(lastFetched)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onRefresh}
            className="px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            Refresh
          </button>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">{user.name}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
