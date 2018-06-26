const Crawler = require('crawler');
const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36';


const nodeCrawler = (url, rateLimit) => {
	const c = new Crawler({ 
		'retries': 1,
		rateLimit: rateLimit || 0
	});

	function crawlerProm(options) {
		return new Promise((resolve, reject) => {
	    options.callback = (err, res, done) => {
	      if (err) {
	      	// not rejecting to keep crawling other lists
	      	console.log('here\'s error =>', err);
	      	resolve();
	      } else {
	        let $ = res.$;
	        resolve($);
	      }
	      done();
	    }
	    c.queue(options);
  	});
	}

	return crawlerProm({
		uri: url,
		userAgent: userAgent
	})
};

module.exports = nodeCrawler;
