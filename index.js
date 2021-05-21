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

const crypto = require("crypto");
const randomId = () => crypto.randomBytes(8).toString("hex");

const { RedisSessionStore } = require("./sessionStore");
const sessionStore = new RedisSessionStore(redisClient);

io.use(async (socket, next) => {
  const sessionID = socket.handshake.auth.sessionID;
  if (sessionID) {
    const session = await sessionStore.findSession(sessionID);
    if (session) {
      socket.sessionID = sessionID;
      socket.userID = session.userID;
      socket.username = session.username;
      return next();
    }
  }
  const username = socket.handshake.auth.username;
  
  if (!username) {
    return next(new Error("invalid username"));
  }
  socket.sessionID = randomId();
  socket.userID = randomId();
  socket.username = username;
  next();
});

io.on("connection", async (socket) => {
  console.log('A user connected');

  // persist session
  sessionStore.saveSession(socket.sessionID, {
    userID: socket.userID,
    username: socket.username,
    connected: true,
  });

  // emit session details
  socket.emit("session", {
    sessionID: socket.sessionID,
    userID: socket.userID,
  });

  // join the "userID" room
  socket.join(socket.userID);

  // fetch existing users
  const users = [];
  const [sessions] = await Promise.all([
    // messageStore.findMessagesForUser(socket.userID),
    sessionStore.findAllSessions(),
  ]);

  sessions.forEach((session) => {
    users.push({
      userID: session.userID,
      username: session.username,
      connected: session.connected
    });
  });

  socket.emit("users", users);

  socket.on("disconnect", async () => {
    const matchingSockets = await io.in(socket.userID).allSockets();
    const isDisconnected = matchingSockets.size === 0;
    if (isDisconnected) {
      // notify other users
      socket.broadcast.emit("user disconnected", socket.userID);
      // update the connection status of the session
      sessionStore.saveSession(socket.sessionID, {
        userID: socket.userID,
        username: socket.username,
        connected: false,
      });
    }
  });
})

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