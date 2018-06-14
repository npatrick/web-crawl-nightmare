'use strict';

const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser')
const rp = require('request-promise');
const Crawler = require('crawler');
const db = require('../db/index');
const instaScraper = require('./controllers/instaScraper');
const userSiteScraper = require('./controllers/userSiteScraper');
const twitterScraper = require('./controllers/twitterScraper');
const facebookScraper = require('./controllers/facebookScraper');
const youtubeScraper = require('./controllers/youtubeScraper');

const app = express();

app.use(logger('dev'));

// simple async/await handler for express
function asyncHandler(p) {
  return function(req, res, next) {
    p(req, res).catch(next)
  }
}

app.post(
  '/sec', 
  asyncHandler(async (req, res) => {
    let params = req.params
  })
)

db.on('open', () => {
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
  ////////////////// Search Engine Area //////////////////////
  // google max iterations = 32
  const googleQuery = 'https://www.google.com/search?q=site:www.instagram.com+%22los+angeles%22+LA+blogger+blog+influencer';
  // bing max iterations = 72
  const bingQuery = 'https://www2.bing.com/search?q=site%3ainstagram.com+"Los+Angeles"+LA+blogger+blog+influencer';
  let segment;

  const searchEngineCrawl = async (nextCount, searchEngine) => {
    let resultObj = {};
    let count = nextCount || 0;
    let searchQuery = searchEngine || googleQuery;

    if (searchQuery.includes('google.com')) {
      segment = `&start=${count * 10}&sa=N`;
    } else if (searchQuery.includes('bing.com')) {
      if (count === 0) {
        segment = '&first=1';
      } else if (count === 1) {
        segment = '&first=13';
      } else {
        segment = `&first=${(14 * count) - 1}`;
      }
    }

    console.log('Current bracket url:', searchQuery + segment);
    let $searchRes = await crawlerPromise({ uri: searchQuery + segment });

    const $body = $searchRes('body');
    let gTemp = $body.find('div.g');
    let bTemp = $body.find('.b_algo');
    let resultList; 
    if ($searchRes(gTemp[0]).html()) {
      // 'div.g' => google specific query results
      resultList = gTemp;
    } else if ($searchRes(bTemp[0]).html()){
      // '.b_algo' => bing query results
      resultList = bTemp;
    } else {
      console.log('No more results...');
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
        let hrefStr = $searchRes(item).find('.r > a').attr('href') || $searchRes(item).find('.b_attribution').text();
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
        tempInstaPath.includes(' ') ? instaUserPath = tempInstaPath.slice(0, tempInstaPath.indexOf(' ')) : instaUserPath = tempInstaPath;
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
    return await searchEngineCrawl(count, searchQuery);
  };

  searchEngineCrawl(null, bingQuery);
//////////////////////////////////////////////////////
// issues on proxies:
// if single proxy problem {
//  check through bypassing proxy to use on nightmare
//  repeat query but with different proxy + repeat proxy auth
// }
// if specific error only for Connection_Tunnel {
//  none so far based on above, so maybe this
//  have to repeat and fix nightmare? maybe restart?
// }

////////////////////// USER WEB AREA ////////////////////////
  // userSiteScraper();

////////////////////// Twitter Area ////////////////////////
  // twitterScraper();

////////////////////// Facebook Area ///////////////////////
  // facebookScraper();

////////////////////// YouTube Area //////////////////////
  // youtubeScraper();

///////////////////////////////////////////////////////////
})

module.exports = app;
