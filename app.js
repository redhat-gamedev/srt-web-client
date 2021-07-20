var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

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
app.use( keycloak.middleware( { logout: '/logout' } ));

/* GET home page. */
app.get('/', checkSsoHandler, function(req, res, next) {
    res.render('index', { title: 'SRT' });
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

function checkSsoHandler(req, res, next){
    // perform middleware function e.g. check if user is authenticated

    if ((req.session['keycloak-token'] ? true : false) && req.kauth.grant.access_token != null) {
      // the user has a token and session info, so continue
      next();
    }

    // missing stuff, so redirect to lobby
    res.redirect(req.protocol + '://localhost:3000');
}

module.exports = app;
