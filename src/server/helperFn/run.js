const beginNightmare = require('./beginNightmare');
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
const run = function * (destination, qSelect, isUserWeb) {
  let normalizeParam;
  let cheerioArr = [];

  if (typeof destination === 'string') {
    normalizeParam = [destination];
  } else {
    normalizeParam = destination;
  }
  for (let i = 0; i < normalizeParam.length; i++ ) {
    let $cheerioObj;
    if (normalizeParam[i] !== null && typeof normalizeParam[i] === 'object') {
      $cheerioObj = yield beginNightmare(normalizeParam[i].website, qSelect, isUserWeb);
      cheerioArr.push({ username: normalizeParam[i].username, cheerioObj: $cheerioObj });
    } else {
      $cheerioObj = yield beginNightmare(normalizeParam[i], qSelect, isUserWeb);
      cheerioArr.push($cheerioObj);
    }
  } // end of for loop
  return cheerioArr;
}; // end of run fn

module.exports = run;