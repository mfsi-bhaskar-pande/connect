var xmpp = require("node-xmpp");
var xml2js = require("xml2js");
var msgCache = require("./messagesCache");
var keys = require("./keys");

var SENDER_ID = process.env.SENDER_ID || keys.SENDER_ID;
var API_KEY = process.env.API_KEY || keys.API_KEY;

var AckMessage = {
    constructor(regId, messageId) {
        this.to = regId;
        this.message_id = messageId;
        this.message_type = "ack"
        return this;
    }
}

var FcmResponseMessage = {
    constructor(jsonPayload) {
        /*_ is the xml2js prefix used to access the character content*/
        var response = JSON.parse(jsonPayload._);
        this.responseType = response.message_type;
        this.messageId = response.message_id;
        return this;
    },

    serverReceiptPayload(receiverFcmToken, senderUid, receiverUid) {

        return {
            message_id: this.messageId,
            data: {
                messageType: MSG_TYPES_RECEIPT,
                refMsg: this.messageId,
                senderUid: senderUid,
                recipientUid: receiverUid
            },
            to: receiverFcmToken
        }
    },

    isAck() {
        return this.responseType === "ack";
    },

    isNack() {
        return this.responseType === "nack";
    }
}

var ChatMessage = {

    constructor(jsonPayload) {
        /*_ is the xml2js prefix used to access the character content*/
        var chatData = JSON.parse(jsonPayload._);
        this.chatMessage = chatData.data.message;
        this.chatReceiverUid = chatData.data.receiverUid;
        this.chatSenderUid = chatData.data.senderUid;
        this.chatSenderFcmToken = chatData.from;
        this.chatMessageId = chatData.message_id;

        return this;
    },

    errorPayloadToSend() {

        return {

            message_id: this.chatMessageId,
            data: {
                refMsg: this.chatMessageId,
                messageType: MSG_TYPES_ERROR,
                message: "This user does not exist",
                senderUid: this.chatSenderUid,
                receiverUid: this.chatReceiverUid
            },
            to: this.chatSenderFcmToken
        }
    },

    payloadToSend(receiverFcmToken) {

        return {
            
            message_id: this.chatMessageId,
            data: {
                refMsg: this.chatMessageId,
                messageType: MSG_TYPES_MESSAGE,
                message: this.chatMessage,
                senderUid: this.chatSenderUid,
                receiverUid: this.chatReceiverUid
            },
            to: receiverFcmToken
        }
    }
}

var parser = new xml2js.Parser();
var xmppClient;
var users;

var MSG_TYPES_MESSAGE = "message";
var MSG_TYPES_RECEIPT = "receipt";
var MSG_TYPES_ERROR = "error";


exports.initialize = function (user) {

    /*This users object contains the information on Registered Users */
    users = user;
    /*
The Cloud Connection Server (CCS) is an XMPP endpoint that provides a persistent, asynchronous, bidirectional connection to Google servers. The connection can be used to send and receive messages between your server and your users' FCM-connected devices.
CCS requires a SASL PLAIN authentication mechanism using <your_FCM_Sender_Id>@gcm.googleapis.com (FCM sender ID) and the Server key as the password.
The CCS XMPP endpoint runs at fcm-xmpp.googleapis.com:5235. When testing functionality with non-production users, you should instead connect to the pre-production server at fcm-xmpp.googleapis.com:5236 (note the different port).*/
    xmppClient = new xmpp.Client({
        jid: SENDER_ID + "@gcm.googleapis.com",
        password: API_KEY,
        host: "fcm-xmpp.googleapis.com",
        port: "5236",
        legacySSL: true,
        preferredSaslMechanism: "PLAIN"
    });

    xmppClient.on("online", connectedToFcm)
    xmppClient.on("stanza", parseStanza);

}

function connectedToFcm() {
    console.log("XMPP client IS READY");
}

/*
Once the XMPP connection is established, CCS and your server use normal XMPP <message> stanzas to send JSON-encoded messages back and forth. The body of the <message> must be:
<gcm xmlns="google:mobile:data">JSON payload</gcm>*/
function createStanzaToSend(jsonPayload) {
    jsonPayload = (typeof jsonPayload !== "string") ? JSON.stringify(jsonPayload) : jsonPayload;
    return "<message><gcm xmlns=\"google:mobile:data\">" + jsonPayload + "</gcm></message>";
}

/**
 * parses the stanzas received by this XmppClient
 * @param {String} stanza the stanza top parse
*/
function parseStanza(stanza) {

    parser.parseString(stanza, function (error, result) {
        if (result != null) {

            var jsonPayloadReceived;
            if (isNormalMessage(result)) {

                /*the gcm property is a sequence of objects read from the gcm tag of stanza.
                We expect a single Object*/
                jsonPayloadReceived = result.message.gcm[0];
                var chat = ChatMessage.constructor(jsonPayloadReceived);
                msgCache.cacheMessage(chat.chatMessageId, chat.chatReceiverUid, chat.chatSenderUid);
                resultHandler(null, chat);

            } else {

                /*the data:gcm property is a sequence of objects read from the gcm tag of stanza.
                We expect a single Object*/
                jsonPayloadReceived = result.message["data:gcm"][0];
                console.log(jsonPayloadReceived);
                var fcmResponse = FcmResponseMessage.constructor(jsonPayloadReceived);
                if (fcmResponse.isAck() && msgCache.isCached(fcmResponse.messageId)) {

                    var msgMetadata = msgCache.getMetadata(fcmResponse.messageId);
                    var fcmToken = users.fetchFcmToken(msgMetadata.senderUid);
                    var payload = fcmResponse.serverReceiptPayload(fcmToken, msgMetadata.senderUid,
                        msgMetadata.receiverUid);
                    var stanza = createStanzaToSend(payload);
                    xmppClient.send(stanza);
                    msgCache.clearMessage(fcmResponse.messageId);    

                } else if (fcmResponse.isNack()) {

                }

            }

            

        } else {
            resultHandler(error, null);
        }
    })
}

function isNormalMessage(result) {
    return result.message.gcm !== undefined;
}

/**
 * handles the output of a stanza parsing operation
 * @param {Error} error the error object thrown
 * @param {ChatMessage} result the result obtained  
 */
function resultHandler(error, result) {

    if (error || !result) {

    } else {
        sendAck(result);
        if (isRecipientValid(result.chatReceiverUid)) {
            relayMessageToDestination(result);
        } else {
            relayErrorToSender(result);
        }
    }

}

/**
 * tests if the intended recipient is registered with the server
 * @param {String} receiverUid 
 */
function isRecipientValid(receiverUid) {

    return users.fetchFcmToken(receiverUid) !== null

}

/**
 * message for which acknowledgement must be sent
 * @param {ChatMessage} chatMessage 
 */
function sendAck(chatMessage) {
    var ack = AckMessage.constructor(chatMessage.chatSenderFcmToken, chatMessage.chatMessageId);
    var stanza = createStanzaToSend(ack);
    xmppClient.send(stanza);

}

/**
 * In case the recipient in invalid an error message is send back to sender
 * @param {ChatMessage} chatMessage 
 */
function relayErrorToSender(chatMessage) {
    var messageToSend = chatMessage.errorPayloadToSend();
    var stanza = createStanzaToSend(messageToSend);
    xmppClient.send(stanza);
}

/**
 * sends message to destination.
 * @param {ChatMessage} chatMessage 
 */
function relayMessageToDestination(chatMessage) {
    var receipientFcmToken = users.fetchFcmToken(chatMessage.chatReceiverUid);
    var messageToRelay = chatMessage.payloadToSend(receipientFcmToken);

    var stanza = createStanzaToSend(messageToRelay);

    xmppClient.send(stanza);

}





