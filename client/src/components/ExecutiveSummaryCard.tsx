import { ExecutiveSummary } from '../utils/executiveSummary';

interface Props {
  summary: ExecutiveSummary;
}

const ExecutiveSummaryCard = ({ summary }: Props) => {
  if (summary.updates.length === 0) {
    return (
      <div className="text-xs text-gray-400 italic">
        No updates
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {summary.updates.map((update, index) => (
        <div key={index} className="text-xs text-gray-700 leading-relaxed">
          <span className="font-semibold text-gray-600">{update.displayDate}:</span> {update.text}
        </div>
      ))}
    </div>
  );
};

export default ExecutiveSummaryCard;
