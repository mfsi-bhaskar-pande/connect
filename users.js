
var chatUsers = {};

/**
 * Adds a user to the list of Users registered with this server.
 * @param {String} fcmToken uniquely identifies the device to fcm.
 * @param {String} userId uniquely identifies the user.
 * @param {String} password user password.
 */
exports.addUser = function(fcmToken,userId, password){

    chatUsers[userId] = new ChatUser(userId, fcmToken, password);

}


exports.updateToken = function(fcmToken, userId){
    chatUsers[userId].fcmToken = fcmToken;
}

exports.isUserValid = function(userId){
     return chatUsers[userId] !== undefined;
}

exports.isUserPasswordCorrect = function(userId, password){
    return chatUsers[userId].password === password;
}

exports.userExists = function(userId){
     return chatUsers[userId] !== undefined;
}

exports.getAllAsJson = getAllUsersAsJson;

/**
 * Gets All Registered Users As Json.
 */
function getAllUsersAsJson(){

    var users = [];
    for (var property in chatUsers) {
        if (chatUsers.hasOwnProperty(property)) {
            var chatUser = chatUsers[property];
            users.push(chatUser.getUserDetailToSend());          
        }
    }
    return JSON.stringify(users);

}



/**
 * returns the fcmToken known for the given deviceId
 * @param {String} userId a unique identifier for a user.
 */
exports.fetchFcmToken = function(userId){
    
    return chatUsers[userId].fcmToken;

}


class ChatUser{
    constructor(userIdentifier, fcmToken, password){
        this.userId = userIdentifier;
        this.fcmToken = fcmToken;
        this.password = password;
    }

    getUserDetailToSend(){
        return {
            userId: this.userId
        }
    }
}