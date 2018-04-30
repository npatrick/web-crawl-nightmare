const PORT = process.env.PORT || 3000;
const app = require('./server');
app.listen(PORT, function () {
  console.log('Listening on port ' + PORT);
});
