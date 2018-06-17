import React from 'react';

const Message = (props) => {
	return
		{props.data.map((item, index) => (
			<p key={`item_${index}_${item.userQuery}`}>
				{item}
			</p>
		))}
};

export default Message;
