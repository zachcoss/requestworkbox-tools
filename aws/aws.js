const 
    AWS = require('aws-sdk'),
    S3 = new AWS.S3(),
    SQS = new AWS.SQS({ region: 'us-east-1' });

module.exports = {
    S3: S3,
    SQS: SQS,
}