export default function OrderStatusBadge({ status }) {
  const map = {
    COMPLETED: 'bg-green-500/10 text-green-400',
    PENDING:   'bg-yellow-500/10 text-yellow-400',
    FAILED:    'bg-red-500/10 text-red-400',
    REFUNDED:  'bg-blue-500/10 text-blue-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${map[status] || 'bg-gray-500/10 text-gray-400'}`}>
      {status}
    </span>
  );
}
