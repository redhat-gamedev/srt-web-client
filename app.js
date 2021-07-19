var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var testRouter = require('./routes/test');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// keycloak-y things
const Keycloak = require('keycloak-connect');
const session = require('express-session');
const memoryStore = new session.MemoryStore();
const keycloak = new Keycloak({ store: memoryStore });

// session
app.use(session({
    secret           : 'thisShouldBeLongAndSecret',
    resave           : false,
    saveUninitialized: true,
    store            : memoryStore,
}));

app.use(keycloak.middleware());

app.use('/', indexRouter);
//app.use('/test', testRouter);
// route protected with Keycloak
app.get('/test', keycloak.protect(), function(req, res) {
    res.render('test', { title: 'Test of the test' });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
