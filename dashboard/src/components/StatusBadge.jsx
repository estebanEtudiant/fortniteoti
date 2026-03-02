export default function StatusBadge({ status, small = false }) {
  const map = {
    ACTIVE:        { bg: 'bg-green-500/10 text-green-400',    label: 'Active' },
    SUCCESS:       { bg: 'bg-green-500/10 text-green-400',    label: 'Succès' },
    EXPIRED:       { bg: 'bg-yellow-500/10 text-yellow-400',  label: 'Expirée' },
    BANNED:        { bg: 'bg-red-500/10 text-red-400',        label: 'Bannie' },
    SUSPENDED:     { bg: 'bg-orange-500/10 text-orange-400',  label: 'Suspendue' },
    HWID_MISMATCH: { bg: 'bg-red-500/10 text-red-400',        label: 'HWID ≠' },
    INVALID_KEY:   { bg: 'bg-red-500/10 text-red-400',        label: 'Invalide' },
    RATE_LIMITED:  { bg: 'bg-yellow-500/10 text-yellow-400',  label: 'Rate Limited' },
  };
  const s = map[status] || { bg: 'bg-gray-500/10 text-gray-400', label: status };
  return (
    <span className={`${s.bg} ${small ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'} rounded-full font-medium`}>
      {s.label}
    </span>
  );
}
