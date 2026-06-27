const delay = (ms) => new Promise(r => setTimeout(r, ms));

export const mockApi = {
  getReports: async () => { await delay(800); return []; },
  createReport: async (data) => { await delay(1000); return { id: Date.now().toString(), ...data }; },
  deleteReport: async (id) => { await delay(500); return true; },
  bulkDeleteReports: async (ids) => { await delay(1000); return true; },
  syncSource: async (name) => { await delay(1500); return true; },
  connectSource: async (name, config) => { await delay(2000); return true; },
  disconnectSource: async (name) => { await delay(800); return true; },
  savePreferences: async (prefs) => { await delay(1000); return true; },
  changePassword: async (curr, newP) => { await delay(1000); return true; },
  regenerateApiKey: async () => { await delay(1000); return { key: 'sk_live_new_key' }; },
  saveWebhook: async (url) => { await delay(800); return true; },
  deleteAccount: async () => { await delay(2000); return true; },
  createSubscription: async (planId) => { await delay(1500); return { success: true }; },
  addPaymentMethod: async (data) => { 
    await delay(1500); 
    return { last4: data.number.slice(-4) || '4242', brand: 'Visa', expiry: data.expiry || '12/26' }; 
  }
};
