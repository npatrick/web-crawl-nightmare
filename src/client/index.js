import React from 'react';
import { render } from 'react-dom';
import App from './app';
import bgImg from './assets/bgImg.jpeg';

import { injectGlobal } from 'styled-components';

injectGlobal`
	body {
		font-family: monospace;
		background: url(${bgImg}) no-repeat center center fixed; 
	  -webkit-background-size: cover;
	  -moz-background-size: cover;
	  -o-background-size: cover;
	  background-size: cover;
	}
`;

render(<App />, document.getElementById("App"));
