const Crawler = require('crawler');
const rp = require('request-promise');
const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36';


const nodeCrawler = async (url, rateLimit, proxy) => {
	let currentProxy;
	if (proxy) {
		currentProxy = await rp('http://localhost:8080/fetch-proxy');
	}

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
	      	if (err.code === 'ECONNRESET') {
	      		nodeCrawler(url, 0, true);
	      	}
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

	if (proxy) {
		console.log('fetch-proxy response:', currentProxy);
		return crawlerProm({
			uri: url,
			userAgent: userAgent,
			proxy: `http://${process.env.PROXYUSER}:${process.env.PROXYPASS}@${currentProxy}`
		})
	}

	return crawlerProm({
		uri: url,
		userAgent: userAgent
	})
};

module.exports = nodeCrawler;
