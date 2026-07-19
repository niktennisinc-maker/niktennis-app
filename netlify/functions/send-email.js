const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  
  const { emails, subject, html, text } = JSON.parse(event.body);
  const RESEND_KEY = process.env.RESEND_API_KEY || 're_jL1z4bka_9oLspez8UzMsXhz44g4dfp6Z';
  
  const results = [];
  
  for (const email of emails) {
    try {
      const payload = JSON.stringify({
        from: 'Nik Tennis <onboarding@resend.dev>',
        to: email.to,
        subject: subject,
        html: html.replace('{{name}}', email.name || ''),
        text: text ? text.replace('{{name}}', email.name || '') : undefined
      });
      
      const result = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'api.resend.com',
          path: '/emails',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
      });
      
      results.push({ email: email.to, status: result.status, id: result.body.id });
      
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 50));
      
    } catch (e) {
      results.push({ email: email.to, status: 'error', error: e.message });
    }
  }
  
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ sent: results.filter(r => r.status === 200).length, total: emails.length, results })
  };
};
