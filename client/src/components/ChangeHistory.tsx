import { ScrollArea } from '@/components/ui/scroll-area';
import type { ClaimChange } from '@shared/schema';

interface ChangeHistoryProps {
  changelog: ClaimChange[];
}

export function ChangeHistory({ changelog }: ChangeHistoryProps) {
  const getChangeIcon = (fieldChanged: string) => {
    if (fieldChanged.includes('status')) return 'fas fa-exchange-alt text-orange-600';
    if (fieldChanged.includes('attachment')) return 'fas fa-paperclip text-green-600';
    if (fieldChanged.includes('item') || fieldChanged.includes('percentage')) return 'fas fa-edit text-blue-600';
    return 'fas fa-clock text-gray-600';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  };

  const getChangeDescription = (change: ClaimChange) => {
    if (change.fieldChanged === 'status') {
      return `Status changed from ${change.oldValue} to ${change.newValue}`;
    }
    return change.fieldChanged;
  };

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-medium text-gray-900">Change History</h4>

      <ScrollArea className="h-64">
        {changelog.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-history text-gray-400 text-2xl mb-2"></i>
            <p className="text-gray-500 text-sm">No changes recorded yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {changelog.map((change, index) => (
              <div key={index} className="flex space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <i className={`${getChangeIcon(change.fieldChanged)} text-xs`}></i>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    {getChangeDescription(change)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimestamp(change.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
