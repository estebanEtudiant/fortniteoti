import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import Loading from '../components/Loading';
import { formatDate } from '../lib/utils';

export default function CustomersPage({ navigate }) {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 25 };
    if (search) params.search = search;
    api.getCustomers(params).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  const doSearch = (e) => { e.preventDefault(); setPage(1); load(); };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Utilisateurs</h1>

      <form onSubmit={doSearch} className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10" placeholder="Rechercher email, username..." />
        </div>
        <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm">
          Rechercher
        </button>
      </form>

      {loading ? <Loading /> : !data?.data?.length ? (
        <div className="text-center text-gray-500 py-12">Aucun utilisateur trouvé</div>
      ) : (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-left">
                    <th className="px-4 py-3">Utilisateur</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Commandes</th>
                    <th className="px-4 py-3">Inscrit le</th>
                    <th className="px-4 py-3">Dernière co.</th>
                    <th className="px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map(c => (
                    <tr key={c.id} onClick={() => navigate(`/customers/${c.id}`)}
                      className="border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer">
                      <td className="px-4 py-3 font-medium">{c.displayName || c.username}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{c.email}</td>
                      <td className="px-4 py-3 text-center">{c._count?.orders ?? 0}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(c.createdAt)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(c.lastLogin)}</td>
                      <td className="px-4 py-3">
                        {c.banned
                          ? <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400">Banni</span>
                          : <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400">Actif</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data.pagination?.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
              <span>{data.pagination.total} utilisateurs — Page {page}/{data.pagination.totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
