var fs = require('fs'),
    path = require('path'),
    https = require('https'),
    uuid = require('node-uuid'),
    util = require('util');

function KooabaClient(kws) {

    this.query = function(file, callback) {

        var fileBuffer,
            boundary = uuid.v1(),
            postOptions = {
                method: kws.query_api.method,
                host: kws.query_api.host,
                path: kws.query_api.path,
                headers: {
                    'Content-Type': 'multipart/form-data; boundary=' + boundary,
                    'Date': new Date().toGMTString(),
                    'Accept': 'application/json',
                    'Authorization': 'Token ' + kws.query_api.secret
                }
            };

        console.log('Start reading image [' + file.path  + ' from disk');

        var readStream = fs.createReadStream(file.path);
        readStream.on('data', function(chunk) {
            if(fileBuffer === undefined) {
                fileBuffer = chunk;
            } else {
                fileBuffer.concat(chunk);
            }
        });

        readStream.on('end', function() {

            console.log('Finished reading the image from disk');

            // Construct the body of the request
            var bodyFilePart = filePart(boundary, file.name + '.png');
            var closingBoundary = '\r\n--' + boundary + '--\r\n';

            var contentLength = Buffer.byteLength(bodyFilePart);
            contentLength += fileBuffer.length;
            contentLength += Buffer.byteLength(closingBoundary);

            postOptions.headers["Content-Length"] = contentLength;


            console.log('\n\nPost image with options:\n' + util.inspect(postOptions, true, null, true));


            var httpsPost = https.request(postOptions);

            httpsPost.write(bodyFilePart);
            httpsPost.write(fileBuffer);
            httpsPost.write(closingBoundary);

            httpsPost.on('error', function(e) {
                callback(e);
            });

            httpsPost.on('response', function(res){
                var body = '';
                console.log('status: ' + res.statusCode);
                console.log("headers: " + util.inspect(res.headers, true, null, true));
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
//                    console.log('BODY: ' + chunk);
                    body += chunk;
                });

                res.on('end', function() {
                    callback(null, JSON.parse(body));
                });

            });

            httpsPost.end();
        });
    };

    function filePart(boundary, filename) {
        console.log('boundary: ' + boundary + ' filename: ' + filename);
        var part = '--' + boundary + '\r\n';
        part += 'Content-Disposition: form-data; name="image"; filename="' + filename + '"' + '\r\n';
        part += 'Content-Transfer-Encoding: binary' + '\r\n';
        part += 'Content-Type: image/png' + '\r\n\r\n';
        return part;
    };


    return this;
}

module.exports = KooabaClient;