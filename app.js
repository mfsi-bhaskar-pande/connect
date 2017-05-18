var http = require("http");
var express = require("express");
var path = require("path");
var bodyParser = require('body-parser')
var params = require("./parameters");
var endPoints = require("./endpoints");
var users = require("./users");
var responseSender = require("./responseSender");
//var fcmXmpp = require("./fcmxmpp");

var app = express();


/*Set the IP and port*/
app.set("port", process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080);
app.set("ip", process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || "0.0.0.0");

/*Set the location of html Pages*/
//app.use(express.static(path.join(__dirname,"/View")));

/*Set the specific body parser*/
app.use(bodyParser.json());


app.get("/", function (request, response) {
    response.sendFile("quotes.html", { "root": "View" });
});

/**
 * list all users 
 */
app.get(endPoints.listAllUsers, function (request, response) {

    console.log("request: " + endPoints.listAllUsers + " :" + request);
    var usersJson = users.getAllAsJson();
    responseSender.sendAsJson(response, usersJson);
    
});

/**
 * User Login
 */
app.post(endPoints.loginUser, function (request, response) {

    var userId = request.body[params.userId];
    var password = request.body[params.password];

    if (users.isUserValid(userId)) {
        var present = users.isUserPasswordCorrect(userId, password);
        if (present) {
            responseSender.notifySuccess(response, { "result": "success" });
        } else {
            responseSender.notifyBadRequest(response, { "result": "incorrect password" });
        }
    } else {
        responseSender.notifyBadRequest(response, { "result": "user not present" });
    }

});

/**
 * Registers User
 */
app.post(endPoints.registerUser, function (request, response) {

    console.log("request: " + endPoints.registerUser + " :" + request)

    var userId = request.body[params.userId];
    var fcmToken = request.body[params.fcmToken];
    var password = request.body[params.password];

    if (userId && fcmToken && password) {
        if (!users.userExists(userId)) {
            users.addUser(fcmToken, userId);
            responseSender.notifySuccess(response, { "result": "success" });
        } else {
            responseSender.notifyBadRequest(response, { "result": "User already exists" });
        }
    } else {
        responseSender.notifyBadRequest(response, { "result": "Invalid Parameters" });
    }

});

/** 
 * Updates Fcm Token
 */
app.post(endPoints.updateFcmToken, function (request, response) {

    console.log("request: " + endPoints.updateFcmToken + " :" + request)

    var userId = request.body[params.userId];
    var fcmToken = request.body[params.fcmToken];

    /** @todo Later REMOVE the #addUser and include isUserValid*/
    if (userId && fcmToken && users.isUserValid(userId)) {
        users.updateToken(fcmToken, userId);
        responseSender.notifySuccess(response, { "result": "success" });
    } else {
        responseSender.notifyBadRequest(response, { "result": "Invalid Parameters" });
    }

});



http.createServer(app).listen(app.get("port"), function () {
    console.log("Server Listening at : " + app.get("port"));
    //fcmXmpp.initialize(users);
});

