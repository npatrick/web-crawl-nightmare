import styled from 'styled-components';

export default styled.button`
	position: relative;
	right: ${(props) => props.right};
	background-color: white;
	border-color: palevioletred;
	border-width: 1px;
	margin-left: 10px;
	margin-right: 10px;
	float: ${(props) => (props.float === 'right' ? 'right' : 'left')};
	color: palevioletred;
	padding: 5px 10px;
	text-align: center;
	text-decoration: none;
	font-size: 12px;
	border-radius: 2px;

	&:hover {
    background: papayawhip;
  }
`;
