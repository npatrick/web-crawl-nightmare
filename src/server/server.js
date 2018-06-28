'use strict';

const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const rp = require('request-promise');
const axios = require('axios');
const Crawler = require('crawler');
const db = require('../db/index');
const instaScraper = require('./controllers/instaScraper');
const userSiteScraper = require('./controllers/userSiteScraper');
const twitterScraper = require('./controllers/twitterScraper');
const facebookScraper = require('./controllers/facebookScraper');
const youtubeScraper = require('./controllers/youtubeScraper');
const InstaUser = require('../db/instaUserSchema');
const app = express();

app.use(logger('dev'));
// modify express to take url that contain any format/type of file
app.use(bodyParser.urlencoded({ extended: false }));

// parses the text as JSON and set to req.body
app.use(bodyParser.json());

app.use('/', express.static(path.join(__dirname, '../../public')));

let processing = false;
let searchStack = [];

// simple async/await handler for express
function asyncHandler(p) {
  return function(req, res, next) {
    p(req, res).catch(next)
  }
}

const c = new Crawler({ rateLimit: 4000 });
const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36';

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
let segment;

const searchEngineCrawl = async (nextCount, searchEngine) => {
  let resultObj = {};
  let count = nextCount || 0;
  let searchQuery = searchEngine;

  if (searchQuery.includes('google')) {
    segment = `&start=${count * 10}&sa=N`;
  } else if (searchQuery.includes('bing')) {
    if (count === 0) {
      segment = '&first=1';
    } else if (count === 1) {
      segment = '&first=13';
    } else {
      segment = `&first=${(14 * count) - 1}`;
    }
  }

  console.log('Current bracket url:', searchQuery + segment);
  let $ = await crawlerPromise({ 
    uri: searchQuery + segment,
    userAgent: userAgent
  });

  const $body = $('body');
  let gTemp = $body.find('div.g'); // 'div.g' => google specific query results
  let bTemp = $body.find('.b_algo'); // '.b_algo' => bing query results
  let resultList; 
  if (gTemp.length !== 0) {
    resultList = gTemp;
  } else if (bTemp.length !== 0) {
    resultList = bTemp;
  } else {
    console.log('No more results... or being blocked');
    console.log('cheerio content:', $body.html());
    return;
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
      let tempInstaPath = hrefStr.toLowerCase().slice(indexOfHttp, indexAfterUsername) + '/';
      let instaUserPath;
      // check for spaces inside a url path, likely
      // occuring when search engine detects a different language
      // it will include ` * Translate this page` in the url
      if (tempInstaPath.includes(' '))  {
        let spaceIndex = tempInstaPath.indexOf(String.fromCharCode(183));
        instaUserPath = tempInstaPath.slice(0, spaceIndex - 1);
      } else { 
        instaUserPath = tempInstaPath;
      }
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
  await instaScraper(resultObj);
  count++;
  await searchEngineCrawl(count, searchQuery);
};

db.on('open', () => {
  ////////////////// Search Engine Area //////////////////////
  // google max iterations = 32
  const googleQuery = 'https://www.google.com/search?q=site:www.instagram.com+%22los+angeles%22+LA+blogger+blog+influencer';
  // bing max iterations = 72
  const bingQuery = 'https://www2.bing.com/search?q=site%3ainstagram.com+"Los+Angeles"+LA+blogger+blog+influencer';

  // searchEngineCrawl(null, bingQuery);
})
//////////////////////////////////////////////////////
let baseQ;

app.get(
  '/sec', 
  asyncHandler(async (req, res) => {
    if (typeof searchStack[0] !== 'object') {
      return res.send('Empty search stack, please add by going to /add-query');
    }

    processing = true;
    res.status(202).send('I am working on it...\nCheck on /status');

    const { searchEngine, userQuery } = searchStack.shift();
    let normQ; 

    console.log('Engine is:', searchEngine);
    console.log('Q is', userQuery);

    if (searchEngine || userQuery) {
      if (searchEngine === 'Google') {
        baseQ = 'https://www.google.com/search?q=site:www.instagram.com';
      } else if (searchEngine === 'Bing') {
        baseQ = 'https://www2.bing.com/search?q=site:instagram.com';
      } else {
        baseQ = 'https://www.google.com/search?q=site:www.instagram.com';
      }

      normQ = userQuery;

      await searchEngineCrawl(null, `${baseQ}+${normQ}`);

      const result = await InstaUser.find({}).count();
      console.log('Whats result?', result);

      if (typeof searchStack[0] !== 'object') {
        console.log('Nothing on stack. Ending the crawl...');
        processing = false;
      } else {
        console.log('Next Q to crawl');
        await axios.get(`http://${process.env.HOST}:${process.env.PORT}/sec`)
          .catch(err => {
            console.log('oops Axios:', err);
          })
      }
    }
  })
);

app.get('/status', (req ,res) => {
  res.status(200).send({'processing': processing, 'stack': searchStack});
});

app.post('/add-query', async (req, res) => {
  let { searchEngine, userQuery } = req.body;
  if (searchEngine === 'Use all') {
    let firstEngine = {
      searchEngine: 'Google',
      userQuery: userQuery
    };
    let secEngine = {
      searchEngine: 'Bing',
      userQuery: userQuery
    }
    searchStack.push(firstEngine, secEngine);
    return res.send(searchStack);
  }
  searchStack.push(req.body);
  res.send(searchStack);
});

////////////////////// USER WEB AREA ////////////////////////
app.get('/user-scraper', 
  asyncHandler(async (req, res) => {
    if (!processing) {
      processing = true;
      res.status(202).send('User website visiting has started!');
      await userSiteScraper();
      processing = false;
    } else {
      res.send('Currently in process of another task');
    }
  })
);
////////////////////// Twitter Area ////////////////////////
app.get('/twitter-scraper', 
  asyncHandler(async (req, res) => {
    if (!processing) {
      processing = true;
      res.status(202).send('Started visiting twitter urls!');
      await twitterScraper();
      processing = false;
    } else {
      res.send('Currently in process of another task');
    }
  })
);
////////////////////// Facebook Area ///////////////////////
app.get('/facebook-scraper', 
  asyncHandler(async (req, res) => {
    if (!processing) {
      processing = true;
      res.status(202).send('Now visiting facebook urls!');
      await facebookScraper();
      processing = false;
    } else {
      res.send('Currently in process of another task');
    }
  })
);
////////////////////// YouTube Area ///////////////////////
app.get('/youtube-scraper', 
  asyncHandler(async (req, res) => {
    if (!processing) {
      processing = true;
      await youtubeScraper();
      processing = false;
      res.send('Finished visiting youtube urls!');
    } else {
      res.send('Currently in process of another task');
    }
  })
);

module.exports = app;
