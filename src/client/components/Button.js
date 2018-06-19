import styled from 'styled-components';

export default styled.button`
	background-color: ${props => (props.primary ? "#6dadc9" : "#7dc6d5")};
	border: none;
	color: white;
	padding: 5px 10px;
	text-align: center;
	text-decoration: none;
	font-size: 12px;
`;
