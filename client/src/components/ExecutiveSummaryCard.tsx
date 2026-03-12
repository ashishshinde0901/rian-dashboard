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

      {/* Key Highlights */}
      {summary.keyHighlights.length > 0 && (
        <div className="px-4 py-3 bg-white border-b border-gray-200">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Key Updates
          </div>
          <div className="space-y-1.5">
            {summary.keyHighlights.map((highlight, index) => (
              <div key={index} className="text-sm text-gray-700 leading-relaxed">
                {highlight}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {summary.timeline.length > 0 && (
        <div className="px-4 py-3 bg-gradient-to-b from-white to-gray-50">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Activity Timeline
          </div>
          <div className="space-y-2">
            {summary.timeline.map((event, index) => (
              <div
                key={event.date}
                className="flex items-start gap-3 group"
              >
                {/* Timeline indicator */}
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-indigo-500' : 'bg-gray-300'} mt-1.5`}></div>
                  {index < summary.timeline.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-200 mt-1"></div>
                  )}
                </div>

                {/* Event content */}
                <div className="flex-1 pb-2">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xs font-semibold ${index === 0 ? 'text-indigo-600' : 'text-gray-600'}`}>
                      {event.displayDate}
                    </span>
                    <span className="text-sm text-gray-700 leading-relaxed">
                      {event.summary}
                    </span>
                  </div>
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
