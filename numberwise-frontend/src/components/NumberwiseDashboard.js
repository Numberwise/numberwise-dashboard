import React, { useState, useEffect } from 'react';
import { RefreshCw, Upload, CheckCircle, AlertCircle, Clock, FileText, DollarSign, Users, Eye, BarChart3, Home, Settings, UserCheck, Archive, TrendingUp, LogOut, Menu, X } from 'lucide-react';
import api from '../services/api';

const NumberwiseDashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [viewMode, setViewMode] = useState('overview');
  const [selectedClient, setSelectedClient] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [dashboardData, setDashboardData] = useState({
    clients: [],
    summary: {},
    lastUpdated: null
  });
  const [clientDetail, setClientDetail] = useState(null);

  const navigationItems = [
    { id: 'dashboard', name: 'Dashboard', icon: Home, active: true },
    { id: 'clients', name: 'Client Management', icon: Users, active: false, badge: 'Soon' },
    { id: 'reports', name: 'Reports & Analytics', icon: TrendingUp, active: false, badge: 'Soon' },
    { id: 'archive', name: 'Invoice Archive', icon: Archive, active: false, badge: 'Soon' },
    { id: 'integrations', name: 'System Integration', icon: Settings, active: false, badge: 'Soon' },
    { id: 'users', name: 'User Management', icon: UserCheck, active: false, badge: 'Soon' },
  ];

  const loadDashboardData = async () => {
    try {
      setError(null);
      const data = await api.getDashboardOverview();
      setDashboardData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to connect to Numberwise API. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadClientDetail = async (clientId) => {
    try {
      setError(null);
      const data = await api.getClientDetail(clientId);
      setClientDetail(data);
    } catch (error) {
      console.error('Failed to load client detail:', error);
      setError('Failed to load client details.');
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (selectedClient && viewMode === 'detail') {
      loadClientDetail(selectedClient);
    }
  }, [selectedClient, viewMode]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    if (selectedClient && viewMode === 'detail') {
      await loadClientDetail(selectedClient);
    }
    setRefreshing(false);
  };

  const getStatusBadge = (count, type) => {
    if (count === 0) return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">0</span>;
    
    const colors = {
      pending: 'bg-orange-100 text-orange-800',
      processing: 'bg-blue-100 text-blue-800',
      ready: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      errors: 'bg-red-100 text-red-800',
      posted: 'bg-green-100 text-green-800'
    };
    
    return <span className={`px-2 py-1 text-xs rounded-full font-medium ${colors[type]}`}>{count}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Dashboard</h2>
          <p className="text-gray-600">Connecting to Railway API...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-white border-r border-gray-200">
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">N</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Numberwise</span>
          </div>
        </div>
        
        <nav className="px-4 py-6 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                  activeSection === item.id
                    ? 'bg-blue-50 text-blue-700'
                    : item.active
                    ? 'text-gray-700 hover:bg-gray-100'
                    : 'text-gray-400'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
            );
          })}
        </nav>
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Pending</p>
                    <p className="text-2xl font-bold text-orange-600">{dashboardData.summary.totalPending}</p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-600" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Processing</p>
                    <p className="text-2xl font-bold text-blue-600">{dashboardData.summary.totalProcessing}</p>
                  </div>
                  <RefreshCw className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Ready</p>
                    <p className="text-2xl font-bold text-green-600">{dashboardData.summary.totalReady}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Errors</p>
                    <p className="text-2xl font-bold text-red-600">{dashboardData.summary.totalErrors}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <h2 className="text-xl font-semibold">Client Overview</h2>
                <p className="text-blue-100 text-sm mt-1">🚀 Live data from Railway API • {dashboardData.clients.length} clients</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                      <th className="px-4 py-4 text-center text-xs font-medium text-gray-500 uppercase">System</th>
                      <th className="px-4 py-4 text-center text-xs font-medium text-gray-500 uppercase">ZV Pending</th>
                      <th className="px-4 py-4 text-center text-xs font-medium text-gray-500 uppercase">ZV Ready</th>
                      <th className="px-4 py-4 text-center text-xs font-medium text-gray-500 uppercase">Acc Posted</th>
                      <th className="px-4 py-4 text-center text-xs font-medium text-gray-500 uppercase">Errors</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dashboardData.clients.map((client) => (
                      <tr key={client.client_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-blue-600 font-medium text-sm">
                                {client.client_name.split(' ').map(word => word[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{client.client_name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 text-xs rounded-full ${client.accounting_system === 'exact_online' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                            {client.accounting_system.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          {getStatusBadge(client.zenvoices_pending, 'pending')}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          {getStatusBadge(client.zenvoices_ready, 'ready')}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          {getStatusBadge(client.accounting_posted, 'posted')}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          {getStatusBadge(client.zenvoices_failed + client.accounting_errors, 'errors')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NumberwiseDashboard;