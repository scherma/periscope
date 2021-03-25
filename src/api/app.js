var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');

var app = express();
app.set('x-powered-by', false);
app.set('trust proxy', '192.168.40.2');
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
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

module.exports = {app: app, server: server};
