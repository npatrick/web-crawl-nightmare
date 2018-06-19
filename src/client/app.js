import React, { Component } from 'react';
import { post as POST, get as GET } from 'axios';
import Message from './components/message.js';

class App extends Component {
	constructor(props) {
		super(props);

		this.state = {
			apiMessage: [],
			userQuery: '',
			searchEngine: '',
			searchStack: []
		}

		this.handleSubmit = this.handleSubmit.bind(this);
		this.handleEngine = this.handleEngine.bind(this);
		this.handleChange = this.handleChange.bind(this);
	}

	componentDidMount() {
		this.timerID = setInterval(
      () => this.searchStatus(),
      60000
    );
	}

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  searchStatus() {
    GET('/status')
			.then((res) => {
				if (!res.data.processing && res.data.stack.length !== 0) {
					GET('/sec');
				}
				this.setState({ searchStack: res.data.stack });
			})
			.catch((err) => console.log('Error on /status', err))
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
				  <input id="searchBox" type="text" name="userQuery" onChange={this.handleChange}></input>
				  <br />
				  <br />
				  <label>
				    Search Engine:
				  </label>
			    <select className="searchEngine" name="searchEngine" onChange={this.handleEngine}>
			    	<option value>Choose one...</option>
			    	<option>Google</option>
			    	<option>Bing</option>
			    </select>
			    <br />
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
								<Message data={this.state.searchStack} />
							</tbody>
						</table>
				</div>
			</div>
		)
	}
}

export default App;
