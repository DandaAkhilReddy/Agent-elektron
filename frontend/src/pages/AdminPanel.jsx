import { useState, useEffect } from 'react';
import { adminAPI, showToast, getUserRole } from '../config/api';
import Navbar from '../components/Navbar';

const AdminPanel = () => {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const isAdmin = getUserRole() === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      showToast('Access denied. Admin privileges required.', 'error');
      return;
    }
    
    loadAdminData();
  }, [isAdmin]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsResponse, logsResponse, usersResponse] = await Promise.all([
        adminAPI.getUsageStats(),
        adminAPI.getLogs(),
        adminAPI.getUsers()
      ]);

      setStats(statsResponse.data);
      setLogs(logsResponse.data || []);
      setUsers(usersResponse.data || []);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      showToast('Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="glass-card p-8 rounded-xl">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400">Administrator privileges required to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'logs', label: 'Activity Logs', icon: '📋' },
    { id: 'system', label: 'System Health', icon: '🔧' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-gray-400">System administration and monitoring dashboard</p>
        </div>

        {/* Tab Navigation */}
        <div className="glass-card p-1 rounded-xl mb-8">
          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="glass-card p-8 rounded-xl text-center">
            <svg className="animate-spin h-8 w-8 text-primary-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            <p className="text-gray-400">Loading admin data...</p>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="glass-card p-6 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Total Users</p>
                        <p className="text-2xl font-bold text-white">{stats?.total_users || 0}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-6 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">SOAP Notes</p>
                        <p className="text-2xl font-bold text-white">{stats?.total_soap_notes || 0}</p>
                      </div>
                      <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-6 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Transcriptions</p>
                        <p className="text-2xl font-bold text-white">{stats?.total_transcriptions || 0}</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-6 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Storage Used</p>
                        <p className="text-2xl font-bold text-white">{stats?.storage_used_gb?.toFixed(1) || '0.0'} GB</p>
                      </div>
                      <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 3v10a2 2 0 002 2h6a2 2 0 002-2V7H7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Users */}
                {stats?.top_users && stats.top_users.length > 0 && (
                  <div className="glass-card p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-white mb-4">Top Active Users</h3>
                    <div className="space-y-3">
                      {stats.top_users.slice(0, 5).map((user, index) => (
                        <div key={index} className="flex items-center justify-between py-2">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                              {user.doctor_email[0].toUpperCase()}
                            </div>
                            <span className="text-white">{user.doctor_email}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-primary-400 font-semibold">{user.total_soap_notes} notes</div>
                            <div className="text-xs text-gray-400">{user.storage_used_mb.toFixed(1)} MB</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="glass-card p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-white mb-4">User Management</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Role</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Last Activity</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">SOAP Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user, index) => (
                        <tr key={index} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-4 text-white">{user.email}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              user.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-400">{user.last_activity || 'Never'}</td>
                          <td className="py-3 px-4 text-primary-400">{user.soap_count || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && (
              <div className="glass-card p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-white mb-4">Activity Logs</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {logs.length > 0 ? logs.map((log, index) => (
                    <div key={index} className="flex items-center space-x-3 py-2 px-4 bg-white/5 rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${
                        log.level === 'error' ? 'bg-red-500' :
                        log.level === 'warning' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-white text-sm">{log.message}</p>
                        <p className="text-xs text-gray-400">{log.timestamp}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-gray-400 text-center py-8">No logs available</p>
                  )}
                </div>
              </div>
            )}

            {/* System Health Tab */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div className="glass-card p-6 rounded-xl">
                  <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">API Server</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-400 text-sm">Online</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Whisper Service</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-400 text-sm">Operational</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Azure Blob Storage</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-400 text-sm">Connected</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Email Service</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-400 text-sm">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;