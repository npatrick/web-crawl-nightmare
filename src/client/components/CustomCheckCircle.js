import { CheckCircle } from 'styled-icons/fa-regular/CheckCircle';

const CustomCheckCircle = CheckCircle.extend`
	display: ${props => (props.submitted === true ? 'inline-block' : 'none')};
	margin-left: 5px;
	color: green;
`;

export default CustomCheckCircle;
