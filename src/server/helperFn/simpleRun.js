const Crawler = require('crawler');

const c = new Crawler({ rateLimit: 3000 });

function crawlerPromise(options, userObj) {
	return new Promise((resolve, reject) => {
		options.callback = (err, res, done) => {
			if (err) {
				reject(err)
			} else {
				let $ = res.$;
				console.log('resolving crawlerPromise for', userObj.username);
				resolve({ username: userObj.username, $cheerioObj: $, uri: options.uri });
			}
			done();
		}
		c.queue(options);
	});
};

const simpleRun = function * (urlObj, userObj) {
	return yield crawlerPromise(urlObj, userObj);
};

module.exports = simpleRun;
