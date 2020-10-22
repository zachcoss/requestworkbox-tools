const 
    schema = require('./schema/schema'),
    socket = require('./socket/socket'),
    AWS = require('./aws/aws');

module.exports = {
    schema: schema,
    S3: AWS.S3,
    SQS: AWS.SQS,
    socket: socket,
}