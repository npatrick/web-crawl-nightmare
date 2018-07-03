const path = require('path');
const ImageminPlugin = require('imagemin-webpack-plugin').default

module.exports = {
	entry: ['./src/client/index.js'],
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'public'),
		publicPath: '/'
	},
	resolve: {
		extensions: ['.js', '.jsx', '.css', '.png', '.jpg', '.gif', 'jpeg']
	},
	plugins: [
		// Use the default settings for everything in /assets/*
    new ImageminPlugin({ test: 'assets/**' }),
    // Make sure that the plugin is after any plugins that add images
    new ImageminPlugin({
      disable: process.env.NODE_ENV !== 'production', // Disable during development
    })
  ],
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
			},
			{
				test: /\.(png|jpg|jpeg|gif)$/,
				use: {
					loader: 'file-loader',
					options: {
						name: '[path][name].[ext]'
					}
				}
			}
		]
	}
};
