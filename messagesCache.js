var messages = {};

MessageMetadata = {

    constructor(receiverUid, senderUid) {
        this.receiverUid = receiverUid;
        this.senderUid = senderUid;
    }
}

exports.cacheMessage = addMessage;
exports.clearMessage = removeMessage;
exports.getMetadata = getMessageMetadata;
exports.isCached = isMessagePresent;


    /**
     * Adds Message To Cache
     * @param {String} messageId the unique Id for the message 
     * @param {String} receiverUid the Uid of the receiver
     * @param {String} senderUid the Uid of the sender
     */
    function addMessage(messageId, receiverUid, senderUid) {

        var msgMetadata = MessageMetadata.constructor(receiverUid, senderUid);
        messages[messageId] = msgMetadata;

    }

/**
 * finds if the message is Cached.
 * @param {String} messageId 
 */
function isMessagePresent(messageId) {

    return messages[messageId] !== undefined;

}

/**
 * gets the metadata corresponding to the messageId
 * @param {String} messageId messageId of the message. 
 */
function getMessageMetadata(messageId) {

    return messages[messageId];

}

/**
 * deletes message with the given Id
 * @param {String} messageId 
 */
function removeMessage(messageId) {

    delete messages[messageId];

}

