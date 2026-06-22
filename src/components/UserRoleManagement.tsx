import React, { useEffect, useState } from 'react';
import { ShieldCheck, UserMinus, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { UserProfile } from '../types.ts';

interface RoleManagementProps {
  token: string | null;
  currentUserId: number | undefined;
}

export const UserRoleManagement: React.FC<RoleManagementProps> = ({ token, currentUserId }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchUsers = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync users list');
      }
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleRoleUpdate = async (targetId: number, targetEmail: string, newRole: 'admin' | 'manager' | 'staff') => {
    if (!token) return;
    setError('');
    setSuccessMsg('');
    setActionLoadingId(targetId);

    try {
      const res = await fetch(`/api/users/${targetId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to modify role');
      }

      setSuccessMsg(`Access privilege for ${targetEmail} updated to [${newRole.toUpperCase()}] successfully.`);
      
      // Update local state smoothly
      setUsers(prev => prev.map(u => u.id === targetId ? { ...u, role: newRole } : u));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
      
      <div>
        <h3 className="text-base font-semibold font-sans text-gray-900">User Account Privilege Controls</h3>
        <p className="text-xs text-gray-400">Review register profiles and modify access credentials for warehouse personnel</p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs font-mono">
          <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
          <span>Syncing operator profiles...</span>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5 sm:-mx-6">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th scope="col" className="px-5 py-3 text-left text-[11px] font-mono uppercase text-gray-400 tracking-wider">Internal ID</th>
                  <th scope="col" className="px-5 py-3 text-left text-[11px] font-mono uppercase text-gray-400 tracking-wider">Operator Profile</th>
                  <th scope="col" className="px-5 py-3 text-left text-[11px] font-mono uppercase text-gray-400 tracking-wider">Registered Since</th>
                  <th scope="col" className="px-5 py-3 text-left text-[11px] font-mono uppercase text-gray-400 tracking-wider">Access Scope Role</th>
                  <th scope="col" className="px-5 py-3 text-right text-[11px] font-mono uppercase text-gray-400 tracking-wider">Control Selection</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50 text-xs">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-gray-400">No register accounts detected.</td>
                  </tr>
                ) : (
                  users.map((profile) => {
                    const isSelf = currentUserId === profile.id;

                    return (
                      <tr key={profile.id} className="hover:bg-slate-50/20 transition-colors">
                        {/* ID */}
                        <td className="px-5 py-4 whitespace-nowrap font-mono text-gray-500 font-medium">
                          #{profile.id}
                        </td>

                        {/* Profile Email details */}
                        <td className="px-5 py-4 whitespace-nowrap font-sans font-medium text-slate-800">
                          <div className="flex items-center gap-2">
                            <span>{profile.email}</span>
                            {isSelf && (
                              <span className="bg-slate-900 text-white text-[9px] font-mono px-1.5 py-0.5 rounded-sm">
                                ACTIVE OPERATOR (YOU)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Stamp since register */}
                        <td className="px-5 py-4 whitespace-nowrap text-gray-400 font-mono">
                          {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-'}
                        </td>

                        {/* Role tag */}
                        <td className="px-5 py-4 whitespace-nowrap uppercase font-mono font-bold text-[10px]">
                          <span className={`px-2 py-1 rounded-sm border ${
                            profile.role === 'admin' 
                              ? 'border-red-200 bg-red-50 text-red-800' 
                              : profile.role === 'manager'
                              ? 'border-indigo-150 bg-indigo-50 text-indigo-800'
                              : 'border-slate-200 bg-slate-50 text-slate-600'
                          }`}>
                            {profile.role}
                          </span>
                        </td>

                        {/* Action Change privilege dropdown */}
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {actionLoadingId === profile.id && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-900" />
                            )}
                            <select
                              id={`select-role-${profile.id}`}
                              disabled={isSelf || actionLoadingId !== null}
                              value={profile.role}
                              onChange={(e) => handleRoleUpdate(profile.id, profile.email, e.target.value as any)}
                              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 font-mono focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="staff">STAFF</option>
                              <option value="manager">MANAGER</option>
                              <option value="admin">ADMIN</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
