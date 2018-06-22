import React, { Component } from 'react';
import { post as POST, get as GET } from 'axios';
import Message from './components/message';
import Wrapper from './components/Wrapper';
import Outer from './components/Outer';
import Inner from './components/Inner';
import Button from './components/Button';
import InputBox from './components/InputBox';
import bgImg from './assets/bgImg.jpeg';
import { HeaderTextH1 } from './components/HeaderText';
import CustomCheckCircle from './components/CustomCheckCircle';


class App extends Component {
	constructor(props) {
		super(props);

		this.state = {
			apiMessage: [],
			userQuery: '',
			searchEngine: '',
			crawlerMessage: '',
			searchStack: [],
			submitted: false,
			crawlerSubmitted: false
		}

		this.handleSubmit = this.handleSubmit.bind(this);
		this.handleEngine = this.handleEngine.bind(this);
		this.handleChange = this.handleChange.bind(this);
		this.runSearchEngineCrawler = this.runSearchEngineCrawler.bind(this);
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
		.then(res => this.setState({ apiMessage: res.data, submitted: true }))
		.catch(err => console.log('error in /add-query', err))
	}

	handleEngine(e) {
		this.setState({ searchEngine: e.target.value, submitted: false });
	}

	handleChange(e) {
		this.setState({ userQuery: e.target.value, submitted: false });
	}

	runSearchEngineCrawler(e) {
		e.preventDefault();
		const that = this;
		GET('/sec')
			.then(res => {
				console.log('what data sec?', res.data);
				this.setState({ crawlerMessage: res.data, crawlerSubmitted: true });
				setTimeout(that.setState({ crawlerSubmitted: false }), 5000);
			})
			.catch(err => console.log('error in /sec', err));
	}

	render() {
		return (
			<Outer>
				<HeaderTextH1>Crawler</HeaderTextH1>
				<form onSubmit={this.handleSubmit}>
				  <InputBox required name="userQuery" onChange={this.handleChange}></InputBox>
				  <br />
				  <br />
				  <label>Search Engine:</label>
			    <select required name="searchEngine" onChange={this.handleEngine}>
			    	<option value=''>Choose one...</option>
			    	<option value='Use all'>Use all</option>
			    	<option value='Google'>Google</option>
			    	<option value='Bing'>Bing</option>
			    </select>
			    <br />
			    <br />
				  <Button primary float="left" type="submit">Submit</Button>
				  <CustomCheckCircle size='26px' submitted={this.state.submitted} />
				  <Button 
				  	float="right"
				  	right="70px" 
				  	onClick={this.runSearchEngineCrawler}
				  >Run Crawler</Button>
				</form>
				<br />
				<br />
				<Wrapper>
					<h3>Current Query Stack:</h3>
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
				</Wrapper>
			</Outer>
		)
	}
}

export default App;
