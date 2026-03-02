import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import Loading from '../components/Loading';
import { formatDate } from '../lib/utils';

export default function LogsPage() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    api.getLogs({ page, limit: 50 }).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [page]);

  const filtered = data?.data?.filter(l => !actionFilter || l.action.includes(actionFilter)) || [];

  if (loading) return <Loading />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Logs d'Activation</h1>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="w-48">
          <option value="">Toutes les actions</option>
          <option value="success">Succès</option>
          <option value="ban">Ban</option>
          <option value="reset">Reset</option>
          <option value="hwid">HWID</option>
        </select>
      </div>

      {!filtered.length ? <p className="text-gray-500">Aucun log</p> : (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-left">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Clé</th>
                    <th className="px-4 py-3">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(log => (
                    <tr key={log.id} className="border-b border-gray-800/50">
                      <td className="px-4 py-2 text-xs text-gray-400">{formatDate(log.createdAt)}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          log.action.includes('success') ? 'bg-green-500/10 text-green-400' :
                          log.action.includes('ban') ? 'bg-red-500/10 text-red-400' :
                          log.action.includes('reset') ? 'bg-amber-500/10 text-amber-400' :
                          'bg-gray-500/10 text-gray-400'}`}>{log.action}</span>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-500">{log.license?.licenseKey || '—'}</td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-500">{log.ipAddress || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {data.pagination?.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
              <span>Page {page}/{data.pagination.totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
