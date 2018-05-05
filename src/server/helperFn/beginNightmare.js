const Nightmare = require('nightmare');
const cheerio = require('cheerio');

const nightmare = Nightmare({
  show: true,
  // gotoTimeout => def:30s, 
  // only used if the DOM itself has not yet loaded
  gotoTimeout: 60000,
  // waitTimeout => def:30s, throws an exception if .wait()
  // didnt return true within the set timeframe
  waitTimeout: 60000,
  // executionTimeout => def:30s, max time to wait for an
  // .evaluate() statement to complete
  executionTimeout: 60000,
  // pollInterval => def:250ms, wait time between checks
  // for the .wait() condition to be successful
  pollInterval: 500,
  // switches => command line switches used by Chrome
  // and supported by Electron
  switches: {
    'ignore-certificate-errors': true
  }
});

/**
 * @param  {String} domain      a url string that is normalized
 *                              for nightmare to visit
 * @param  {String} selectorStr the queryString to retrieve
 *                              from the html
 * @param  {Boolean} isUserWeb  are you passing a user's personal site?
 * @return {Function}           returns a cheerio fn that can
 *                              be interacted w/ .html(),
 *                              .find(), .text(), etc.
 */
const beginNightmare = (domain, selectorStr, isUserWeb) => {
    let waitTimer = isUserWeb ? 1 : 2000;
  	let normalizeDomain = '';
  	if (!domain.includes('http')) {
  		normalizeDomain = `http://${domain}`;
  	} else {
  		normalizeDomain = domain;
  	}
    console.log('now checking in ', normalizeDomain);
		return nightmare
      .goto(normalizeDomain)
      .wait(waitTimer)
    	.wait(selectorStr)
      .evaluate((selector) => {
        return window.document.querySelector(selector).outerHTML;
      }, selectorStr)
      .then((el) => {
        const $ = cheerio.load(el);
        return $;
      })
      .catch(error => {
        console.log(`Execution failed on beginNightmare fn for ${normalizeDomain}\n Error stat:`, error);
        return;
      })
  };

module.exports = beginNightmare;
