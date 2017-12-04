module.exports = {
  context: __dirname + '/src/scripts',
  entry: {
    'index': './index.js',
    'hack_fetch_thread': './hack_fetch_thread.js',
    'background': './background.js'
  },
  output: {
    path: __dirname + '/dist/scripts',
    filename: "[name].js",
    chunkFilename: "[id].js"
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel-loader",
        query:{
          presets: [
            ["env", {
              "targets": {
                "chrome": 59
              },
              "loose": true
            }]
          ],
          plugins: [
            "transform-class-properties"
          ]
        }
      }
    ]
  }
};
