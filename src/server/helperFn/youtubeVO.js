const vo = require('vo');

const youtubeVo = (youtubeListToVisit) => {
	function responseHandler(responses) {
		return responses.map(res => res);
	}

	return vo(youtubeListToVisit, responseHandler);
};

module.exports = youtubeVo;
