const
    _ = require('lodash'),
    passwordHash = require('pbkdf2-password-hash');

    module.exports = {
        validateToken: async function(IndexSchema, apiKey) {
            try {
                if (!apiKey) throw new Error('Missing API Key.')
                if (!/^[0-9A-F]+$/.test(apiKey)) throw new Error('Incorrect API Key type.')
                if (!_.size(apiKey) === 32) throw new Error('Incorrect API Key type.')

                const uuid = apiKey
                const snippet = uuid.substring(0,8)
                const token = await IndexSchema.Token.findOne({ snippet, active: true, }).lean()

                if (!token || !token._id) throw new Error('Token not found.')
                if (!token.hash) throw new Error('Token not found.')

                const validToken = await passwordHash.compare(uuid, token.hash)
                
                return token.sub
            } catch(err) {
                console.log('Validate token error', err)
                throw new Error('Validate token error.')
            }
        },
    }