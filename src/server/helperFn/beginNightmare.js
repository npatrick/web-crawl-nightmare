const Nightmare = require('nightmare');
const cheerio = require('cheerio');

const nightmare = Nightmare({
  show: true,
  gotoTimeout: 60000,
  waitTimeout: 60000,
  executionTimeout: 60000,
  pollInterval: 500
});

/**
 * @param  {String} domain      a url string that is normalized
 *                              for nightmare to visit
 * @param  {String} selectorStr the queryString to retrieve
 *                              from the html
 * @return {Function}           returns a cheerio fn that can
 *                              be interacted w/ .html(),
 *                              .find(), .text(), etc.
 */
const beginNightmare = (domain, selectorStr) => {
  	let normalizeDomain = '';
  	if (!domain.includes('http')) {
  		normalizeDomain = `http://${domain}`;
  	} else {
  		normalizeDomain = domain;
  	}
    console.log('now checking in ', normalizeDomain);
		return nightmare
      .goto(normalizeDomain)
      .wait(2000)
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
