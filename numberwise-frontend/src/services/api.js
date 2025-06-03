class NumberwiseAPI {
    constructor() {
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
  
    async getDashboardOverview() {
      return this.request('/dashboard/overview');
    }
  
    async getClientDetail(clientId) {
      return this.request(`/dashboard/client/${clientId}`);
    }
  }
  
  const api = new NumberwiseAPI();
  export default api;