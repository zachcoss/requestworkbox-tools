const 
    schema = require('./schema/schema'),
    stats = require('./tools/stats').init;

module.exports = {
    schema: schema,
    stats: stats,
}