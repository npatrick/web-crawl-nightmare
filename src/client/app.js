import React, { Component } from 'react';
import { post as POST } from 'axios';
import Message from './components/message.js';

class App extends Component {
	constructor(props) {
		super(props);

		this.state = {
			apiMessage: [],
			userQuery: '',
			searchEngine: ''
		}

		this.handleSubmit = this.handleSubmit.bind(this);
		this.handleEngine = this.handleEngine.bind(this);
		this.handleChange = this.handleChange.bind(this);
	}

	handleSubmit(e) {
		e.preventDefault();
		const { searchEngine, userQuery } = this.state;
		let encodeQuote;
		let doubleQuote;
		let normQ;

		// removals
		encodeQuote = encodeURI(userQuery);
		normQ = encodeQuote.replace(/\'/g, '%27');

		POST('/add-query', {
			searchEngine: searchEngine,
			userQuery: normQ
		})
		.then(res => this.setState({ apiMessage: res.data }))
		.catch(err => console.log('error in /add-query', err))
	}

	handleEngine(e) {
		this.setState({ searchEngine: e.target.value });
	}

	handleChange(e) {
		this.setState({ userQuery: e.target.value });
	}

	render() {
		return (
			<div className="App">
				<h2>Add query for crawling</h2>
				<form onSubmit={this.handleSubmit}>
				  <label>
				    Search Engine:
				  </label>
			    <select className="searchEngine" name="searchEngine" onChange={this.handleEngine}>
			    	<option value>Choose one...</option>
			    	<option>Google</option>
			    	<option>Bing</option>
			    </select>
			    <br />
				  <label>
				  Query:
				  </label>
				  <input type="text" name="userQuery" onChange={this.handleChange}></input>
				  <br />
				  <input type="submit" value="Submit" />
				</form>
				<br />
				<br />
				<div className="apiMessage">
					<h3>Server Response:</h3>
						<table>
							<thead>
								<tr>
									<th>Search Engine</th>
									<th>Query</th>
								</tr>
							</thead>
							<tbody>
								<Message data={this.state.apiMessage} />
							</tbody>
						</table>
				</div>
			</div>
		)
	}
}

export default App;
