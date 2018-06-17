const path = require('path');

module.exports = {
	entry: ['./src/client/index.js'],
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'public'),
		publicPath: '/'
	},
	resolve: {
		extensions: ['.js', '.jsx', '.css', '.png', '.jpg', '.gif']
	},
	module: {
		rules: [
			{
				test: /\.jsx?$/, // Match both .js and .jsx files
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: ['react', 'env']
					}
				}
			}
		]
	}
};
