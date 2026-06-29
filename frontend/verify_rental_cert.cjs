const axios = require('axios');

async function run() {
  const email = `test_demo_${Date.now()}@solvai.com`;
  const password = "password123!";
  const orgName = "Test Demo Org";
  
  // 1. Get backend URL
  const { execSync } = require('child_process');
  const apiUrl = execSync('gcloud run services describe solvai-api --region=europe-west1 --project=solvai-prod --format="value(status.url)"').toString().trim();
  console.log('API URL:', apiUrl);
  
  const client = axios.create({ baseURL: apiUrl, headers: {'Content-Type': 'application/json'} });
  
  try {
    // 2. Register
    console.log('Registering user...');
    await client.post('/auth/register', { email, password, organization_name: orgName });
    
    // 3. Login
    console.log('Logging in...');
    const loginRes = await client.post('/auth/login', { email, password });
    const token = loginRes.data.access_token;
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // 4. Create first rental cert (should succeed)
    console.log('Creating 1st Rental Certificate...');
    const req1 = await client.post('/solvency-reports/', { report_type: 'RENTAL' });
    console.log('1st Cert Created. ID:', req1.data.id);
    
    // 5. Create second rental cert (should fail)
    console.log('Creating 2nd Rental Certificate...');
    try {
      await client.post('/solvency-reports/', { report_type: 'RENTAL' });
      console.error('FAIL: 2nd Cert should have failed but succeeded.');
    } catch (err) {
      if (err.response && err.response.status === 402) {
        console.log('SUCCESS: 2nd Cert failed with 402 (Payment Required) as expected.');
        console.log('Message:', err.response.data.detail);
      } else {
        console.error('FAIL: Unexpected error:', err.message);
      }
    }
  } catch (err) {
    console.error('Error during verification:', err.response?.data || err.message);
  }
}

run();
