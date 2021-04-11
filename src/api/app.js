var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var options = require('./lib/options');

var indexRouter = require('./routes/index');
var accountRouter = require('./routes/account');
var adminRouter = require('./routes/admin');
var visitsRouter = require('./routes/visits');
var targetsRouter = require('./routes/targets');

var app = express();
app.set('x-powered-by', false);

if (options.get("http", "reverse_proxy")) {
  app.set('trust proxy', options.get("http", "reverse_proxy"));
}

const server = require("http").Server(app);
const io = require('socket.io')(server, { allowEIO3: true });

app.use(function (req, res, next) {
  res.io = io;
  next();
});

const websockets = require("./routes/websocket")(io);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(session({
  key: 'user_sid',
  secret: options.get("http", "session_secret"),
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    maxAge: 1000 * 86400 * 90,
    secure: true
  }
}));

app.use((req, res, next) => {
  if (req.cookies.user_sid && !req.session.user) {
    res.clearCookie('user_sid');
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/account', accountRouter);
app.use('/admin', adminRouter);
app.use('/visits', visitsRouter);
app.use('/targets', targetsRouter);

module.exports = {app: app, server: server};
