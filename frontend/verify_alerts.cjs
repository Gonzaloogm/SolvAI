const axios = require('axios');

async function run() {
  const email = `test_demo_${Date.now()}@solvai.com`;
  const password = "password123!";
  const orgName = "Test Demo Org Alerts";
  
  const { execSync } = require('child_process');
  const apiUrl = execSync('gcloud run services describe solvai-api --region=europe-west1 --project=solvai-prod --format="value(status.url)"').toString().trim();
  const client = axios.create({ baseURL: apiUrl, headers: {'Content-Type': 'application/json'} });
  
  try {
    await client.post('/auth/register', { email, password, organization_name: orgName });
    const loginRes = await client.post('/auth/login', { email, password });
    client.defaults.headers.common['Authorization'] = `Bearer ${loginRes.data.access_token}`;
    
    // Create a report
    console.log('Generating report...');
    const req1 = await client.post('/solvency-reports/', { report_type: 'FULL' });
    const reportId = req1.data.id;
    
    // Poll for completion
    let attempts = 0;
    while(attempts < 20) {
      const rep = await client.get(`/solvency-reports/${reportId}`);
      if(rep.data.status === 'COMPLETED' || rep.data.status === 'FAILED') {
        console.log('Report finished with status:', rep.data.status);
        break;
      }
      await new Promise(r => setTimeout(r, 3000));
      attempts++;
    }
    
    // Check alerts
    const alertsRes = await client.get('/alerts/');
    console.log('Alerts:', alertsRes.data);
    if(alertsRes.data.length > 0) {
      console.log('SUCCESS: Alerts are working!');
    } else {
      console.error('FAIL: No alerts found for this user.');
    }
  } catch(err) {
    console.error(err);
  }
}

run();
