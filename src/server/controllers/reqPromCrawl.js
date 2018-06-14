const Crawler = require('crawler');
const instaScraper = require('./instaScraper');

const c = new Crawler({ rateLimit: 3000 });

function crawlerPromise(options) {
	return new Promise((resolve, reject) => {
		options.callback = (err, res, done) => {
			if (err) {
				reject(err);
			} else {
				let $ = res.$;
				resolve($);
			}
			done();
		}
		c.queue(options);
	});
}

let resultObj = {};

let reqPromCrawl = async function (url) {
  await crawlerPromise({ uri: url })
  	.then(($) => {
      const $body = $('body');
      let gTemp = $body.find('div.g');
      let bTemp = $body.find('.b_algo');
      let resultList; 
      if ($(gTemp[0]).html()) {
      	// 'div.g' => google specific query results
        resultList = gTemp;
      } else if ($(bTemp[0]).html()){
      	// '.b_algo' => bing query results
        resultList = bTemp;
      } else {
        console.log('No more results...');
      	// return instaScraper(null);
      	throw new Error('No more results')
      }
      let dbUserCheck = []; // used for bulk checking on mongo by $in utilization
      let tempInsta = [];

      if (resultList.length === 0) {
        console.log('Possibly no items to iterate on search results');
        return
      } else {
        // iterate google result items to retrieve insta url to visit
        resultList.each((index, item) => {
          // need to check from cheerio markup results because we dont exactly
          // get what we see on browser
          let hrefStr = $(item).find('.r > a').attr('href') || $(item).find('.b_attribution').text();
          let indexOfHttp = hrefStr.indexOf('http');
          let indexOfCom = hrefStr.indexOf('.com/');
          // g vs b => bing returns exact insta href, google doesn't...
          let indexAfterUsername = hrefStr.indexOf('/', indexOfCom + 5);
          if (indexAfterUsername === -1) {
            indexAfterUsername = undefined;
          }
          let instaUserPath = hrefStr.toLowerCase().slice(indexOfHttp, indexAfterUsername) + '/';
          // only add profiles urls and NOT posts urls
          if (!instaUserPath.includes('/p/') && 
              !instaUserPath.includes('/explore/') &&
              !instaUserPath.includes('/about/') &&
              !instaUserPath.includes('/blog/')) {
            // retrieve username from a hyperlink and set it to instaUser
            let temp = instaUserPath.slice(instaUserPath.indexOf('.com/') + 5);
            let instaUser = temp.replace('/', '');
            tempInsta.push(instaUserPath);
            dbUserCheck.push(instaUser);
          }
        })
      }
      resultObj.dbUserCheck = dbUserCheck; // array of usernames
      resultObj.tempInsta = tempInsta; // array of insta urls
      return instaScraper(resultObj);
    })
    .catch(err => {
    	console.error('Error occured..... see last: \n', err);
    	if (err === 'No more results') {
    		console.log('Inside condition error, no more!');
    		return;
    	}
    });
};

module.exports = reqPromCrawl;
