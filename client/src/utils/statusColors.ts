/**
 * Get color classes for task status based on keywords
 * Returns Tailwind classes for background, text, and border colors
 */
export const getStatusColors = (status: string | undefined): {
  bg: string;
  text: string;
  border: string;
} => {
  if (!status) {
    return {
      bg: 'bg-gray-100',
      text: 'text-gray-500',
      border: 'border-gray-200',
    };
  }

  const statusLower = status.toLowerCase();

  // Blocked / Issues - Red
  if (
    statusLower.includes('blocked') ||
    statusLower.includes('issue') ||
    statusLower.includes('problem') ||
    statusLower.includes('stuck') ||
    statusLower.includes('critical')
  ) {
    return {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-300',
    };
  }

  // In Progress / Delivery / Active - Green
  if (
    statusLower.includes('in progress') ||
    statusLower.includes('delivery') ||
    statusLower.includes('active') ||
    statusLower.includes('working') ||
    statusLower.includes('ongoing') ||
    statusLower.includes('started')
  ) {
    return {
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-300',
    };
  }

  // Completed / Done - Blue
  if (
    statusLower.includes('completed') ||
    statusLower.includes('done') ||
    statusLower.includes('finished') ||
    statusLower.includes('closed')
  ) {
    return {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-300',
    };
  }

  // Pending / Waiting / On Hold - Yellow
  if (
    statusLower.includes('pending') ||
    statusLower.includes('waiting') ||
    statusLower.includes('on hold') ||
    statusLower.includes('paused') ||
    statusLower.includes('deferred')
  ) {
    return {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      border: 'border-yellow-300',
    };
  }

  // Review / Testing - Purple
  if (
    statusLower.includes('review') ||
    statusLower.includes('testing') ||
    statusLower.includes('qa') ||
    statusLower.includes('validation')
  ) {
    return {
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      border: 'border-purple-300',
    };
  }

  // Planning / Design - Indigo
  if (
    statusLower.includes('planning') ||
    statusLower.includes('design') ||
    statusLower.includes('draft') ||
    statusLower.includes('proposal')
  ) {
    return {
      bg: 'bg-indigo-100',
      text: 'text-indigo-700',
      border: 'border-indigo-300',
    };
  }

  // Not Started / Backlog - Gray
  if (
    statusLower.includes('not started') ||
    statusLower.includes('backlog') ||
    statusLower.includes('todo') ||
    statusLower.includes('new')
  ) {
    return {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-300',
    };
  }

  // Default - Neutral gray
  return {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
  };
};
