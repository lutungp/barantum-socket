var express = require('express');
var router = express.Router();
var cors = require('cors')

var corsOptions = {
    origin: [process.env.CLIENT_LINK],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 200
}

router.get('/status', cors(corsOptions), function (req, res, next) {
    res.send("connected");
});

module.exports = router;
