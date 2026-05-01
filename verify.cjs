const https = require('https');

https.get('https://www.skillhub-it.uz', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const match = data.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (match) {
      const jsUrl = 'https://www.skillhub-it.uz' + match[1];
      console.log('Fetching', jsUrl);
      https.get(jsUrl, (res2) => {
        let jsData = '';
        res2.on('data', chunk => jsData += chunk);
        res2.on('end', () => {
          if (jsData.includes('issue.author.charAt')) {
            console.log('BUG: issue.author.charAt is STILL in the live JS bundle!');
          } else {
            console.log('SUCCESS: issue.author.charAt is NOT in the live JS bundle.');
          }
          if (jsData.includes('getProject')) {
            console.log('SUCCESS: getProject is in the live JS bundle.');
          } else {
            console.log('BUG: getProject is NOT in the live JS bundle!');
          }
        });
      });
    } else {
      console.log('Could not find JS bundle in index.html');
    }
  });
});
