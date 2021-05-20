var express = require('express')
var app = express()
require('dotenv').config();

const http = require('http').Server(app);

const Redis = require("ioredis");
const redisClient = new Redis();

var cors = require('cors')
app.use(cors())

const io = require('socket.io')(http, {
  cors: {
    origin: [process.env.CLIENT_LINK],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 200
  },
  adapter: require("socket.io-redis")({
    pubClient: redisClient,
    subClient: redisClient.duplicate(),
  }),
});

var port = process.env.PORT || 8000;

var indexRouter = require('./routes/index');

app.use('/', indexRouter);
// Start the Server
http.listen(port, function() {
    console.log('Server Started. Listening on *:' + port);
});

// Store people in chatroom
var chatters = [];

// Store messages in chatroom
var chat_messages = [];