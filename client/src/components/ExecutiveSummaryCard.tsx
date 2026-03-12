import { ExecutiveSummary } from '../utils/executiveSummary';

interface Props {
  summary: ExecutiveSummary;
}

const ExecutiveSummaryCard = ({ summary }: Props) => {
  // Color scheme based on status
  const statusColors = {
    green: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      text: 'text-green-800',
      badge: 'bg-green-100 border-green-400',
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      text: 'text-yellow-800',
      badge: 'bg-yellow-100 border-yellow-400',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'text-red-800',
      badge: 'bg-red-100 border-red-400',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-800',
      badge: 'bg-blue-100 border-blue-400',
    },
    gray: {
      bg: 'bg-gray-50',
      border: 'border-gray-300',
      text: 'text-gray-800',
      badge: 'bg-gray-100 border-gray-400',
    },
  };

  const colors = statusColors[summary.statusColor];

  return (
    <div className={`border-2 rounded-lg overflow-hidden ${colors.border}`}>
      {/* Header with Overall Status */}
      <div className={`${colors.bg} px-4 py-3 border-b-2 ${colors.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Project Status
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold border-2 ${colors.badge} ${colors.text}`}>
              {summary.overallStatus}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            Updated: {summary.lastUpdated}
          </span>
        </div>
      </div>

      {/* Updates List */}
      {summary.updates.length > 0 && (
        <div className="px-4 py-3 bg-white">
          <div className="space-y-2.5">
            {summary.updates.map((update, index) => (
              <div key={index} className="flex items-start gap-3">
                {/* Bullet point */}
                <div className="flex-shrink-0 mt-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                </div>

                {/* Update content */}
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-indigo-600">
                      {update.displayDate}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {update.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveSummaryCard;
