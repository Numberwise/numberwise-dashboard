class NumberwiseAPI {
    constructor() {
      // Your live Railway API
      this.baseURL = 'https://numberwise-dashboard-production.up.railway.app/api';
    }
  
    async request(endpoint, options = {}) {
      const url = `${this.baseURL}${endpoint}`;
      
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      };
  
      try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
  
        return await response.json();
      } catch (error) {
        console.error('API Request failed:', error);
        throw error;
      }
    }
  
    // Dashboard endpoints
    async getDashboardOverview() {
      return this.request('/dashboard/overview');
    }
  
    async getClientDetail(clientId) {
      return this.request(`/dashboard/client/${clientId}`);
    }
  
    // Health check
    async getHealth() {
      return this.request('/test-db');
    }
  }
  
  // Export singleton instance
  const api = new NumberwiseAPI();
  export default api;