const 
    mongoose = require('./schema/mongoose'),
    schema = require('./schema/schema'),
    socket = require('./socket/socket'),
    AWS = require('./aws/aws');

module.exports = {
    mongoose: mongoose,
    schema: schema,
    S3: AWS.S3,
    SQS: AWS.SQS,
    socket: socket,
}