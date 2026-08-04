import React, { useState, useEffect } from 'react';
import { adminAPI, getImageUrl } from '../services/api';
import { ShieldAlert, Users, AlertTriangle, Check, Trash2, DollarSign, Package } from 'lucide-react';

export default function Admin() {
  const [metrics, setMetrics] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [reports, setReports] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dashboard'); // dashboard, users, reports, disputes

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      try {
        const metricsRes = await adminAPI.getDashboard();
        const rawMetrics = metricsRes.data.metrics;
        setMetrics({
          total_users: rawMetrics.total_users,
          total_products: rawMetrics.total_listings,
          escrow_held: rawMetrics.funds_in_escrow,
          total_reports: rawMetrics.pending_reports
        });

        const usersRes = await adminAPI.getUsers();
        setUsersList(usersRes.data);

        const reportsRes = await adminAPI.getReports();
        setReports(reportsRes.data);

        const disputesRes = await adminAPI.getDisputes();
        setDisputes(disputesRes.data);
      } catch (err) {
        console.error("Failed to load admin data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  const handleToggleBan = async (id, name, currentBanStatus) => {
    if (!window.confirm(`${currentBanStatus ? 'Unban' : 'Ban'} user "${name}"?`)) return;
    try {
      await adminAPI.toggleBan(id);
      setUsersList((prev) => 
        prev.map(u => u.id === id ? { ...u, is_banned: !currentBanStatus } : u)
      );
      alert(`User status updated.`);
    } catch (err) {
      alert('Failed to update ban status.');
    }
  };

  const handleResolveReport = async (reportId, statusUpdate) => {
    try {
      await adminAPI.resolveReport(reportId, statusUpdate);
      setReports((prev) => 
        prev.map(r => r.id === reportId ? { ...r, status: statusUpdate } : r)
      );
      alert(`Report marked as ${statusUpdate}.`);
    } catch (err) {
      alert('Failed to resolve report.');
    }
  };

  const handleDeleteListing = async (productId, title) => {
    if (!window.confirm(`Delete reported listing "${title}"?`)) return;
    try {
      await adminAPI.deleteProduct(productId);
      alert('Listing deleted successfully.');
      // Reload reports to reflect changes
      const reportsRes = await adminAPI.getReports();
      setReports(reportsRes.data);
    } catch (err) {
      alert('Failed to delete listing.');
    }
  };

  const handleResolveDispute = async (disputeId, decision) => {
    if (!window.confirm(`Are you sure you want to resolve this dispute in favor of the ${decision}?`)) return;
    try {
      await adminAPI.resolveDispute(disputeId, decision);
      alert(`Dispute resolved in favor of the ${decision}.`);
      
      const disputesRes = await adminAPI.getDisputes();
      setDisputes(disputesRes.data);

      const metricsRes = await adminAPI.getDashboard();
      const rawMetrics = metricsRes.data.metrics;
      setMetrics({
        total_users: rawMetrics.total_users,
        total_products: rawMetrics.total_listings,
        escrow_held: rawMetrics.funds_in_escrow,
        total_reports: rawMetrics.pending_reports
      });
    } catch (err) {
      console.error(err);
      alert("Failed to resolve dispute.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 border-b border-slate-100 pb-4 dark:border-slate-800">
        <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-8 w-8 text-amber-500" />
          Admin Dashboard
        </h2>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-3 border-b border-slate-250 pb-2 dark:border-slate-800">
        <button 
          onClick={() => setTab('dashboard')} 
          className={`px-4 py-2 font-bold text-sm border-b-2 transition ${tab === 'dashboard' ? 'border-brand-600 text-brand-600 dark:border-brand-500' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
        >
          Overview
        </button>
        <button 
          onClick={() => setTab('users')} 
          className={`px-4 py-2 font-bold text-sm border-b-2 transition ${tab === 'users' ? 'border-brand-600 text-brand-600 dark:border-brand-500' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
        >
          Users ({usersList.length})
        </button>
        <button 
          onClick={() => setTab('reports')} 
          className={`px-4 py-2 font-bold text-sm border-b-2 transition ${tab === 'reports' ? 'border-brand-600 text-brand-600 dark:border-brand-500' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
        >
          Reports ({reports.filter(r => r.status === 'pending').length})
        </button>
        <button 
          onClick={() => setTab('disputes')} 
          className={`px-4 py-2 font-bold text-sm border-b-2 transition ${tab === 'disputes' ? 'border-brand-600 text-brand-600 dark:border-brand-500' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
        >
          Disputes ({disputes.filter(d => d.status === 'pending').length})
        </button>
      </div>

      {/* Content panels */}
      {tab === 'dashboard' && metrics && (
        <div className="space-y-8">
          {/* Metrics grids */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-4">
              <div className="rounded-2xl bg-brand-50 p-3 text-brand-600 dark:bg-brand-900/10">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-450 uppercase">Total Users</span>
                <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{metrics.total_users}</div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-4">
              <div className="rounded-2xl bg-brand-50 p-3 text-brand-600 dark:bg-brand-900/10">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-455 uppercase">Total Listings</span>
                <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{metrics.total_products}</div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-4">
              <div className="rounded-2xl bg-brand-50 p-3 text-brand-600 dark:bg-brand-900/10">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-460 uppercase">Escrow Held</span>
                <div className="text-2xl font-black text-slate-800 dark:text-slate-100">${metrics.escrow_held}</div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-4">
              <div className="rounded-2xl bg-red-50 p-3 text-red-650 dark:bg-red-900/10">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-465 uppercase">Pending Reports</span>
                <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{metrics.total_reports}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-350">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-400 dark:bg-slate-950 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {usersList.map((usr) => (
                  <tr key={usr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <img src={getImageUrl(usr.profile_picture, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150')} alt="Avatar" className="h-8 w-8 rounded-full object-cover" />
                      <span className="font-bold">{usr.name} {usr.is_admin && <span className="text-[9px] font-black uppercase text-amber-500 border border-amber-400 rounded px-1 ml-1">Admin</span>}</span>
                    </td>
                    <td className="px-6 py-4">{usr.email}</td>
                    <td className="px-6 py-4">
                      {usr.is_banned ? (
                        <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-bold text-red-500 dark:bg-red-950/20">Banned</span>
                      ) : (
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-500 dark:bg-emerald-950/20">Active</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!usr.is_admin && (
                        <button
                          onClick={() => handleToggleBan(usr.id, usr.name, usr.is_banned)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${usr.is_banned ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-950/20'}`}
                        >
                          {usr.is_banned ? 'Unban' : 'Ban User'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="rounded-2xl border border-slate-150 p-8 text-center text-slate-400">No flags reported.</div>
          ) : (
            reports.map((rep) => (
              <div key={rep.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-black uppercase rounded px-2 py-0.5 ${rep.status === 'pending' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/10' : 'bg-slate-100 text-slate-400 dark:bg-slate-850'}`}>
                      {rep.status}
                    </span>
                    <span className="text-xs text-slate-400">Reported by User ID: #{rep.reporter_id}</span>
                  </div>
                  <h4 className="font-extrabold text-slate-850 dark:text-slate-155">Reason: {rep.reason}</h4>
                  <p className="text-sm text-slate-500 mt-1">Details: {rep.details || 'No additional details provided.'}</p>
                  
                  <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs dark:border-slate-850 dark:bg-slate-950/50">
                    <span className="font-bold text-slate-450 block">Target Product:</span>
                    <span className="font-semibold">{rep.product.title}</span>
                    <span className="block mt-0.5 text-slate-400">Listing Price: ${rep.product.price}</span>
                  </div>
                </div>

                {rep.status === 'pending' && (
                  <div className="flex md:flex-col justify-end gap-2 shrink-0">
                    <button
                      onClick={() => handleResolveReport(rep.id, 'resolved')}
                      className="flex items-center justify-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <Check className="h-4 w-4" />
                      Resolve Report
                    </button>
                    <button
                      onClick={() => handleResolveReport(rep.id, 'dismissed')}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold hover:bg-slate-50 dark:border-slate-800"
                    >
                      Dismiss Report
                    </button>
                    <button
                      onClick={() => handleDeleteListing(rep.product.id, rep.product.title)}
                      className="flex items-center justify-center gap-1 rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-100 dark:bg-red-950/20"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Listing
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'disputes' && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Active Disputes</h3>
          {disputes.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
              <p className="text-slate-500">No disputes active or filed in the system.</p>
            </div>
          ) : (
            disputes.map((disp) => (
              <div key={disp.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                    <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                      Dispute #{disp.id} (Transaction #{disp.transaction_id})
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${disp.status === 'pending' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'}`}>
                      {disp.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Buyer Side */}
                    <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-100 dark:bg-rose-950/5 dark:border-rose-900/20 text-xs">
                      <span className="font-black text-rose-700 dark:text-rose-455 block mb-1">Buyer Claim & Evidence:</span>
                      <p className="text-slate-700 dark:text-slate-350 leading-relaxed font-semibold">{disp.buyer_evidence}</p>
                      {disp.buyer_image_url && (
                        <a href={disp.buyer_image_url} target="_blank" rel="noreferrer" className="block text-brand-600 font-bold mt-2 hover:underline">
                          🖼️ View Buyer Proof Photo
                        </a>
                      )}
                    </div>
                    
                    {/* Seller Side */}
                    <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100 dark:bg-amber-950/5 dark:border-amber-900/20 text-xs">
                      <span className="font-black text-amber-700 dark:text-amber-455 block mb-1">Seller Defense / Response:</span>
                      {disp.seller_evidence ? (
                        <>
                          <p className="text-slate-700 dark:text-slate-350 leading-relaxed font-semibold">{disp.seller_evidence}</p>
                          {disp.seller_image_url && (
                            <a href={disp.seller_image_url} target="_blank" rel="noreferrer" className="block text-brand-600 font-bold mt-2 hover:underline">
                              🖼️ View Seller Proof Photo
                            </a>
                          )}
                        </>
                      ) : (
                        <p className="text-slate-400 italic font-semibold">Awaiting seller response counter-evidence...</p>
                      )}
                    </div>
                  </div>
                </div>

                {disp.status === 'pending' && (
                  <div className="flex md:flex-col justify-end gap-2 shrink-0 self-center">
                    <button
                      onClick={() => handleResolveDispute(disp.id, 'buyer')}
                      className="flex items-center justify-center gap-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 text-xs font-bold transition shadow-sm"
                    >
                      Refund Buyer
                    </button>
                    <button
                      onClick={() => handleResolveDispute(disp.id, 'seller')}
                      className="flex items-center justify-center gap-1 rounded-xl bg-[#0d5c3a] hover:bg-[#084228] text-white px-4 py-2.5 text-xs font-bold transition shadow-sm"
                    >
                      Payout Seller
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
