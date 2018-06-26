const beginNightmare = require('./beginNightmare');
const nodeCrawler = require('./nodeCrawler');
/**
 * Run
 * Iterate the insta urls and sequentialy visit each
 * 
 * @param {String, Array} destination
 * @param {String} qSelect
 * @param {Boolean} isUserWeb
 * @yield {Function} this fn returns an array of objects depending
 *                   on the passed destination arg, for ex.:
 *                   if a String is passed, no username included
 *                   so the return is only an array of cheerio fns.
 *                   Otherwise, if an array of objects were passed
 *                   {username: 'username', website: 'url'}, an array
 *                   of objects will be returned:
 *                   {username: 'username', cheerioObj: fn}
 */
const run = function * (destination, qSelect, isUserWeb, useProxy) {
  let normalizeParam;
  let cheerioArr = [];

  if (typeof destination === 'string') {
    normalizeParam = [destination];
  } else {
    normalizeParam = destination;
  }

  for (let i = 0; i < normalizeParam.length; i++ ) {
    let $cheerioObj;
    let tempUrl;
    let protocolUrl;
    if (normalizeParam[i] !== null && typeof normalizeParam[i] === 'object') {
      if (isUserWeb) {
        tempUrl = normalizeParam[i].website;
        if (!tempUrl.includes('://')) {
          protocolUrl = `http://${tempUrl}`;
        } else {
          protocolUrl = tempUrl;
        }
        $cheerioObj = yield nodeCrawler(protocolUrl);
      } else {
        tempUrl = normalizeParam[i].website;
        if (tempUrl.includes('twitter.com')) {
          if (!tempUrl.includes('://')) {
            protocolUrl = `http://${tempUrl}`;
          } else {
            protocolUrl = tempUrl;
          }
          $cheerioObj = yield nodeCrawler(protocolUrl, 1);
        } else {
          $cheerioObj = yield beginNightmare(tempUrl, qSelect, isUserWeb, useProxy);
        }
      }
      cheerioArr.push({ username: normalizeParam[i].username, cheerioObj: $cheerioObj });
    } else {
      if (isUserWeb) {
        tempUrl = normalizeParam[i];
        if (!tempUrl.includes('://')) {
          protocolUrl = `http://${tempUrl}`;
        } else {
          protocolUrl = tempUrl;
        }
        $cheerioObj = yield nodeCrawler(protocolUrl);
      } else {
        tempUrl = normalizeParam[i];
        if (tempUrl.includes('twitter.com')) {
          if (!tempUrl.includes('://')) {
            protocolUrl = `http://${tempUrl}`;
          } else {
            protocolUrl = tempUrl;
          }
          $cheerioObj = yield nodeCrawler(protocolUrl, 1);
        } else {
          $cheerioObj = yield beginNightmare(tempUrl, qSelect, isUserWeb, useProxy);
        }
      }
      cheerioArr.push($cheerioObj);
    }
  } // end of for loop
  return cheerioArr;
}; // end of run fn

module.exports = run;
