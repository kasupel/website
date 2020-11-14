var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var expressNunjucks = require('express-nunjucks');
var sassMiddleware = require('node-sass-middleware');

var indexRouter = require('./routes/index');

var app = express();
var developmentMode = app.get('env') === 'development';

// View engine setup
app.set('views', path.join(__dirname, 'templates'));
app.set('view engine', 'njk');
const nunjucks = expressNunjucks(app, {
  watch: developmentMode,
  noCache: developmentMode
});

// Middleware setup
app.use(logger('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sassMiddleware({
  src: path.join(__dirname, 'sass'),
  dest: path.join(__dirname, 'static', 'css'),
  prefix: '/static/css',
  indentedSyntax: true,    // Sass, not SCSS
  sourceComments: false
}));

// Router setup
app.use('/static/', express.static(path.join(__dirname, 'static')));
app.use('/', indexRouter);

// Any path not matched so far is a 404 error.
app.use(function(req, res, next) {
  next(createError(404));
});

// Add error handling.
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = developmentMode ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
