import { Link, useLocation } from 'react-router-dom';

const DashboardNav = () => {
  const location = useLocation();

  const navItems = [
    { path: '/media-sales', label: 'Media Sales' },
    { path: '/media-delivery', label: 'Media Delivery' },
    { path: '/corporate-sales', label: 'Corporate Sales' },
    { path: '/corporate-delivery', label: 'Corporate Delivery' },
  ];

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm overflow-x-auto">
      <div className="w-full lg:w-[90%] mx-auto px-3 sm:px-4">
        <nav className="flex space-x-1 min-w-max sm:min-w-0">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default DashboardNav;
