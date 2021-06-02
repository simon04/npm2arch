const https = require('https');

module.exports = function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, res => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        if (200 <= res.statusCode && res.statusCode < 300) {
          const json = JSON.parse(body);
          resolve(json);
        } else {
          reject(res.statusCode);
        }
      });
    });
    req.on('error', error => reject(error));
  });
};
