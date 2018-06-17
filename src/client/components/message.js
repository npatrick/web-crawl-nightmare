import React from 'react';

const Message = (props) => {
	if (props.data.length === 0) {
		return null;
	} else {
		return props.data.map((item, index) => {
			return (
				<tr key={`item_${index}_${item.userQuery}`}>
					<td>{item.searchEngine}</td>
					<td>{decodeURI(item.userQuery)}</td>
				</tr>
			)

		}
		)
	}
};

export default Message;
