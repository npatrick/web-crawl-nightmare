import React, { Component } from 'react';

class App extends Component {

	render() {
		return (
			<div className="App">
				<h2>Add query for crawling</h2>
				<form>
				  <label>
				    Search Engine:
				  </label>
			    <select class="searchEngine">
			    	<option value>Google</option>
			    	<option>Bing</option>
			    </select>
			    <br />
				  <label>
				  Query:
				  </label>
				  <input type="text" name="userQuery"></input>
				  <input type="submit" value="Submit" />
				</form>
			</div>
		)
	}
}

export default App;
