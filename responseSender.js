
exports.notifySuccess = sendRequestSuccess
exports.notifyBadRequest = sendBadRequest
exports.sendAsJson = sendJsonResponse


/**
 * Sends the response as success.
 * @param {Response} response the Response object to which to write
 * @param {*} result the result to write to the response body
 */
function sendRequestSuccess(response, result){

    response.writeHead(200,{"Content-Type":"application/json"});
    var msg = (typeof result !== "string")? JSON.stringify(result) : result;
    response.end(msg);

}

/**
 * Sends the result by writing the supplied JSON to response
 * @param {Response} response 
 * @param {String} result 
 */
function sendJsonResponse(response, result){
    response.writeHead(200,{"Content-Type":"application/json"});
    response.end(result);
}


function sendBadRequest(response, result){

    response.writeHead(400,{"Content-Type":"application/json"});
    var msg = (typeof result !== "string")? JSON.stringify(result): result;
    response.end(msg);


}