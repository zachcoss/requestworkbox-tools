const
    _ = require('lodash');

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

    module.exports.init = function() {
        return {
            updateQueueStats: async function(payload, IndexSchema, socketService) {
                const { queue, status, statusText, error } = payload
                
                // Create Queue Stat
                const queueStat = new IndexSchema.QueueStat({
                    active: true,
                    sub: queue.sub,
                    instance: queue.instance,
                    queue: queue._id,
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
    
                socketService.io.emit(queue.sub, { queueDoc: queue, })
            },
            batchUpdateQueueStats: async function(payload, IndexSchema, socketService) {
                const { queueDocs, status, statusText, error } = payload
    
                // Batch create queue stats
                const bulkQueueStats = _.map(queueDocs, (queue) => {
                    // Create Queue Stat
                    const queueStat = new IndexSchema.QueueStat({
                        active: true,
                        sub: queue.sub,
                        instance: queue.instance,
                        queue: queue._id,
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
                            filter: { _id: queueStat.queue },
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
                        if (queueStat.queue === queue._id) return true
                        else return false
                    })[0]
    
                    queue.stats.push(queueStat)
                    queue.status = 'queued'
                    socketService.io.emit(queue.sub, { queueDoc: queue, })
                })
            },
            updateInstanceStats: async function(payload, IndexSchema, S3) {
                const { instance, statConfig, err } = payload
    
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
                    Bucket: "connector-storage",
                    Key: `${instance.sub}/instance-statistics/${statBackup.instance}/${statBackup._id}`,
                    Body: JSON.stringify(statBackup)
                }).promise()
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
            updateStorageUsage: async function(payload, IndexSchema) {
                const { storage, usages } = payload

                // Batch Create Usage
                const bulkUsages = _.map(usages, (usage) => {
                    const usageStat = new IndexSchema.Usage(usage)
                    return usageStat
                })

                // Insert many queue stat
                const insertMany = await IndexSchema.Usage.insertMany(bulkUsages)

                // Add to Storage
                _.each(insertMany, (usage) => {
                    updateUsageAndTotals(storage, usage)
                })
                
                await storage.save()
            },
        }
    }