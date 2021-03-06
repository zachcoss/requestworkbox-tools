const
    _ = require('lodash'),
    queueKeys = ['_id','active','status','stats','instanceId','workflowId','requestId','workflowName','storageInstanceId','queueType','date','createdAt','updatedAt'],
    queueStatKeys = ['_id','active','status','statusText','error','instanceId','queueId','createdAt','updatedAt'],
    instanceKeys = ['_id','active','projectId','workflowId','workflowName','requestId','queueType','queueId','stats','totalBytesDown','totalBytesUp','totalMs','createdAt','updatedAt'],
    instanceStatKeys = ['_id','active','requestName','requestType','requestId','instanceId','status','statusText','startTime','endTime','duration','responseSize','taskId','taskField','createdAt','updatedAt'];

    function updateUsageAndTotals(assetDoc, usageDoc) {
        // Update usage
        assetDoc.usage.push(usageDoc._id)

        // Recalculate totals
        if (usageDoc.usageMeasurement === 'byte') {
            if (usageDoc.usageDirection === 'up') {
                assetDoc.totalBytesUp = (assetDoc.totalBytesUp || 0) + usageDoc.usageAmount
            } else if (usageDoc.usageDirection === 'down') {
                assetDoc.totalBytesDown = (assetDoc.totalBytesDown || 0) + usageDoc.usageAmount
            }
        } else if (usageDoc.usageMeasurement === 'ms') {
            assetDoc.totalMs = (assetDoc.totalMs || 0) + usageDoc.usageAmount
        }
    }

    function processQueueDoc(queueDoc) {
        let queue = _.pickBy(queueDoc, function(value, key) {
            return _.includes(queueKeys, key)
        })
        queue.stats = _.map(queue.stats, (stat) => {
            const responseData = _.pickBy(stat, function(value, key) {
                return _.includes(queueStatKeys, key)
            })
            return responseData
        })
        return queue
    }

    function processInstanceDoc(instanceDoc) {
        let instance = _.pickBy(instanceDoc, function(value, key) {
            return _.includes(instanceKeys, key)
        })
        instance.stats = _.map(instance.stats, (stat) => {
            const responseData = _.pickBy(stat, function(value, key) {
                return _.includes(instanceStatKeys, key)
            })
            return responseData
        })
        return instance
    }

    module.exports.init = function() {
        return {
            updateQueueStats: async function(payload, IndexSchema, socketService) {
                const { queue, status, statusText, error } = payload
                
                // Create Queue Stat
                const queueStat = new IndexSchema.QueueStat({
                    active: true,
                    sub: queue.sub,
                    instanceId: queue.instanceId,
                    queueId: queue._id,
                    status: status,
                    statusText: statusText || '',
                    error: error || false,
                })
                await queueStat.save()
    
                // Add to Queue
                queue.stats.push(queueStat)
                // Update status
                queue.status = status
                // Save queue
                await queue.save()
    
                socketService.io.emit(queue.sub, { queueDoc: processQueueDoc(queue.toJSON()), })
            },
            batchUpdateQueueStats: async function(payload, IndexSchema, socketService) {
                const { queueDocs, status, statusText, error } = payload
    
                // Batch create queue stats
                const bulkQueueStats = _.map(queueDocs, (queue) => {
                    // Create Queue Stat
                    const queueStat = new IndexSchema.QueueStat({
                        active: true,
                        sub: queue.sub,
                        instanceId: queue.instanceId,
                        queueId: queue._id,
                        status: status,
                        statusText: statusText || '',
                        error: error || false,
                    })
                    return queueStat
                })
    
                // Insert many queue stat
                const insertMany = await IndexSchema.QueueStat.insertMany(bulkQueueStats)
    
                // Batch update queue docs
                const bulkQueueUpdates = _.map(insertMany, (queueStat) => {
                    return {
                        updateOne: {
                            filter: { _id: queueStat.queueId },
                            update: {
                                $set : { status : queueStat.status },
                                $push: { stats: queueStat._id },
                            },
                        }
                    }
                })
    
                // Bulk write queues
                const bulkWrite = await IndexSchema.Queue.bulkWrite(bulkQueueUpdates)
    
                // Generate artificial clone of queue doc for socket
                _.each(queueDocs, (queue) => {
                    const queueStat = _.filter(bulkQueueStats, (queueStat) => {
                        if (queueStat.queueId === queue._id) return true
                        else return false
                    })[0]
    
                    queue.stats.push(queueStat)
                    queue.status = 'queued'
                    socketService.io.emit(queue.sub, { queueDoc: processQueueDoc(queue.toJSON()), })
                })
            },
            updateInstanceStats: async function(payload, IndexSchema, S3, STORAGE_BUCKET, socketService) {
                const { instance, statConfig, } = payload
    
                // Create Instance Stat
                const omittedStat = _.omit(statConfig, ['requestPayload','responsePayload', 'headers'])
                const instanceStat = new IndexSchema.Stat(omittedStat)
                await instanceStat.save()
    
                // Add to Instance
                instance.stats.push(instanceStat._id)
                await instance.save()
    
                // S3 Stat
                const statBackup = _.assign(statConfig, {_id: instanceStat._id})
                await S3.upload({
                    Bucket: STORAGE_BUCKET,
                    Key: `${instance.projectId}/instance-statistics/${instance._id}/${statBackup._id}`,
                    Body: JSON.stringify(statBackup)
                }).promise()

                socketService.io.emit(instance.sub, { instanceDoc: processInstanceDoc(instance.toJSON()), })
            },
            updateInstanceUsage: async function(payload, IndexSchema) {
                const { instance, usages } = payload

                // Batch Create Usage
                const bulkUsages = _.map(usages, (usage) => {
                    const usageStat = new IndexSchema.Usage(usage)
                    return usageStat
                })

                // Insert many queue stat
                const insertMany = await IndexSchema.Usage.insertMany(bulkUsages)

                // Add to Instance
                _.each(insertMany, (usage) => {
                    updateUsageAndTotals(instance, usage)
                })
                
                await instance.save()
            },
        }
    }