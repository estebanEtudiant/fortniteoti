export default function InfoCard({ label, value, mono = false }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-sm ${mono ? 'font-mono text-xs break-all' : ''} ${!value || value === '—' || value === '— Non liée —' ? 'text-gray-600' : ''}`}>
        {value || '—'}
      </p>
    </div>
  );
}
