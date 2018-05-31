const instaScraper = require('./instaScraper');

let reqPromCrawl = async function (url) {
  await instaScraper(url)
    .catch(err => console.error('Error occured..... see last: \n', err));
};

module.exports = reqPromCrawl;
