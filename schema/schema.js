// accepts the mongoose and autopopulate libraries
// from each instance
module.exports = (mongoose, mongooseAutoPopulate, nodeEnv) => {
    if (!mongoose || !mongooseAutoPopulate) {
        throw new Error('Missing Required Packages')
    }
    
    const 
        Schema = mongoose.Schema;

    mongoose.plugin(mongooseAutoPopulate)

    // Queue Status Values
    const queueStatusValue = ['received', 'uploading', 'pending', 'queued', 'starting', 'initializing', 'loading', 'running', 'webhook', 'complete', 'error', 'archived']

    // Key Value Schema
    const KeyValueSchema = new mongoose.Schema({
        active: Boolean,
        key: String,
        value: String,
        valueType: { type: String, enum: ['textInput','storage','runtimeResult','incomingField'] }
    })

    const KeyValueDefault = () => {
        return {
            active: true,
            key: '',
            value: '',
            valueType: 'textInput'
        }
    }

    const TokenSchema = new mongoose.Schema({
        active: { type: Boolean, default: true, required: true  },
        sub: { type: String, required: true },
        snippet: { type: String, required: true },
        hash: { type: String, required: true },
    }, { timestamps: true })

    const QueueSchema = new mongoose.Schema({
        active: { type: Boolean, default: true, required: true  },
        sub: { type: String, required: true },
        instanceId: { type: Schema.Types.ObjectId, required: true },
        workflowId: { type: Schema.Types.ObjectId, required: true },
        workflowName: { type: String, required: true  },
        workflowType: { type: String, required: true, default: 'workflow', enum: ['request','workflow',] },
        requestId: { type: Schema.Types.ObjectId, required: false },

        status: { type: String, enum: queueStatusValue },
        queueType: { type: String, enum: ['queue', 'schedule', 'return'] },
        date: { type: Date, },
        storageInstanceId: { type: String  },
        stats: [{
            type: Schema.Types.ObjectId,
            ref: 'QueueStat',
            autopopulate: true
        }],
        ipAddress: { type: String },

        publicUser: { type: Boolean, default: true, required: true  },
    }, { timestamps: true })

    const BillingSchema = new mongoose.Schema({
        active: { type: Boolean, default: true },
        sub: { type: String, required: true },

        stripeCustomerId: { type: String },
        stripeCardBrand: { type: String },
        stripeCardMonth: { type: String },
        stripeCardYear: { type: String },
        stripeCardLast4: { type: String },

        // stripeCurrentPeriodStart: { type: Date },
        // stripeCurrentPeriodEnd: { type: Date },
        // stripeSubscriptionId: { type: String },
    }, { timestamps: true })

    const SettingSchema = new mongoose.Schema({
        active: { type: Boolean, default: true },
        sub: { type: String, required: true },
        username: { type: String, required: true },
    }, { timestamps: true })

    const UsageSchema = new mongoose.Schema({
        active: { type: Boolean, default: true },
        sub: { type: String, required: true },
        usageType: { type: String, enum: ['storage', 'request', 'webhook', 'stat',] },
        usageDirection: { type: String, enum: ['up', 'down', 'time'] },
        usageAmount: { type: Number },
        usageLocation: { type: String, enum: ['api', 'instance', 'queue'] },
        usageMeasurement: { type: String, enum: ['byte', 'ms'] },
        usageId: { type: Schema.Types.ObjectId, },
        usageDetail: { type: String },
    }, { timestamps: true })

    const UsageDaySchema = new mongoose.Schema({
        active: { type: Boolean, default: true },
        projectId: { type: Schema.Types.ObjectId, required: true },

        // only includes information from instance usage schema
        // (not storage schema)
        hours: {
            type: [new mongoose.Schema({
                start: { type: Date },
                end: { type: Date },
                totalBytesDown: { type: Number , required: true, default: 0 },
                totalBytesUp: { type: Number , required: true, default: 0 },
                totalMs: { type: Number , required: true, default: 0 },
            })],
        },

        start: { type: Date },
        end: { type: Date },
        totalBytesDown: { type: Number, required: true, default: 0 },
        totalBytesUp: { type: Number, required: true, default: 0 },
        totalMs: { type: Number, required: true, default: 0 },
    }, { timestamps: true })

    const FeedbackSchema = new mongoose.Schema({
        active: { type: Boolean, default: true },
        sub: { type: String, required: true },
        feedbackType: { type: String, required: true, default: 'general' },
        feedbackText: { type: String, },
    }, { timestamps: true })

    const StorageSchema = new mongoose.Schema({
        active: { type: Boolean, default: true },
        sub: { type: String, required: true },
        name: { type: String, required: true, default: 'Untitled Storage' },
        projectId: { type: Schema.Types.ObjectId, required: true },
        storageType: { type: String, enum: ['text', 'file'] },
        fieldname: { type: String, },
        originalname: { type: String, },
        encoding: { type: String, },
        mimetype: { type: String, },
        filename: { type: String, },
        size: { type: Number, },
        storageValue: Schema.Types.Mixed,
        totalBytesDown: { type: Number },
        totalBytesUp: { type: Number },
        totalMs: { type: Number },

        lockedResource: { type: Boolean, required: true, default: false, },
        preventExecution: { type: Boolean, required: true, default: false, },
        sensitiveResponse: { type: Boolean, required: true, default: false, },
    }, { timestamps: true })

    const ProjectPermissionsValues = ['owner','team','public']

    const ProjectSchema = new mongoose.Schema({
        active: { type: Boolean, required: true, default: true },
        sub: { type: String, required: true },
        name: { type: String, required: true, default: 'Untitled Project' },
        owner: { type: Boolean, required: false, default: false },

        projectType: { type: String, required: true, default: 'free', enum: ['free','standard','developer','professional'] },
        globalWorkflowStatus: { type: String, required: true, default: 'running', enum: ['running','stopped','locked',] },

        returnRequest: { type: String, required: true, default: 'owner', enum: ProjectPermissionsValues },
        returnWorkflow: { type: String, required: true, default: 'owner', enum: ProjectPermissionsValues },

        queueRequest: { type: String, required: true, default: 'owner', enum: ProjectPermissionsValues },
        queueWorkflow: { type: String, required: true, default: 'owner', enum: ProjectPermissionsValues },

        scheduleRequest: { type: String, required: true, default: 'owner', enum: ProjectPermissionsValues },
        scheduleWorkflow: { type: String, required: true, default: 'owner', enum: ProjectPermissionsValues },

        workflowCount: { type: Number, required: true, default: 0 },
        workflowLast: { type: Date, required: true, default: new Date() },

        usage: { type: Number, required: true, default: 0 },
        usageRemaining: { type: Number, required: true, default: 1000 },
        usageTotal: { type: Number, required: true, default: 1000 },
    }, { timestamps: true })

    const MemberSchema = new mongoose.Schema({
        active: { type: Boolean, default: true },
        sub: { type: String, required: true },
        owner: { type: Boolean, required: true, default: false, },
        username: { type: String, required: true },
        projectName: { type: String, required: false, default: '' },
        projectUsername: { type: String, required: false, default: '' },

        status: { type: String, required: true, default: 'invited', enum: ['invited','accepted','removed'] },
        permission: { type: String, required: true, default: 'read', enum: ['read','write','none'] },
        includeSensitive: { type: Boolean, required: true, default: false, },

        projectId: { type: Schema.Types.ObjectId, required: true, },
    }, { timestamps: true })

    const RequestSchema = new mongoose.Schema({
        active: { type: Boolean, default: true },
        sub: { type: String, required: true },
        projectId: { type: Schema.Types.ObjectId, required: true },
        workflowId: { type: Schema.Types.ObjectId, required: false },
        method: { type: String, default: 'GET', required: true, enum: ['GET','POST','get','post'] },
        url: { type: String, default: 'https://api.requestworkbox.com' },
        name: { type: String, default: 'Sample Request' },
        authorizationType: { type: String, required: true, default: 'noAuth', enum: ['noAuth','basicAuth'] },
        authorization: {
            type: [ KeyValueSchema ],
            default: [ KeyValueDefault() ]
        },
        query: {
            type: [ KeyValueSchema ],
            default: [ KeyValueDefault() ]
        },
        headers: {
            type: [ KeyValueSchema ],
            default: [ KeyValueDefault() ]
        },
        body: {
            type: [ KeyValueSchema ],
            default: [ KeyValueDefault() ]
        },

        lockedResource: { type: Boolean, required: true, default: false, },
        preventExecution: { type: Boolean, required: true, default: false, },
        sensitiveResponse: { type: Boolean, required: true, default: false, },
    }, { timestamps: true })

    const WorkflowSchema = new mongoose.Schema({
        active: { type: Boolean, default: true },
        sub: { type: String, required: true },
        name: { type: String, default: 'Untitled Workflow' },
        projectId: { type: Schema.Types.ObjectId, required: true },
        requestId: { type: Schema.Types.ObjectId, required: false },
        workflowType: { type: String, required: true, default: 'workflow', enum: ['request','workflow',] },
        
        tasks: {
            type: [new mongoose.Schema({
                active: Boolean,
                requestId: Schema.Types.ObjectId,
                runtimeResultName: { type: String, default: '', },
            })],
            default: [{
                active: true,
            }],
        },

        payloads: {
            type: [new mongoose.Schema({
                active: Boolean,
                requestId: Schema.Types.ObjectId,
            })],
            default: [{
                active: true,
            }],
        },

        webhooks: {
            type: [new mongoose.Schema({
                active: Boolean,
                requestId: Schema.Types.ObjectId,
            })],
            default: [{
                active: true,
            }],
        },

        lockedResource: { type: Boolean, required: true, default: false, },
        preventExecution: { type: Boolean, required: true, default: false, },
    }, { timestamps: true })

    const InstanceSchema = new mongoose.Schema({
        active: { type: Boolean, default: true },
        sub: { type: String, required: true },
        projectId: { type: Schema.Types.ObjectId, required: true },
        workflowId: { type: Schema.Types.ObjectId, required: true },
        workflowName: { type: String },
        workflowType: { type: String, required: true, default: 'workflow', enum: ['request','workflow',] },
        requestId: { type: Schema.Types.ObjectId, required: false },

        stats: [{
            type: Schema.Types.ObjectId,
            ref: 'Stat',
            autopopulate: true
        }],
        usage: [{
            type: Schema.Types.ObjectId,
            ref: 'Usage',
            autopopulate: true
        }],
        totalBytesDown: { type: Number },
        totalBytesUp: { type: Number },
        totalMs: { type: Number },

        queueId: { type: Schema.Types.ObjectId, },
        queueType: { type: String, enum: ['queue', 'schedule', 'return'] },
        ipAddress: { type: String },
        publicUser: { type: Boolean, default: true, required: true  },
    }, { timestamps: true })

    const StatSchema = new mongoose.Schema({
        active: { type: Boolean, default: true },
        instanceId: { type: Schema.Types.ObjectId, required: true },
        taskId: { type: Schema.Types.ObjectId, required: true },
        taskField: { type: String, required: true, enum: ['payloads','tasks','webhooks'] },
        requestName: { type: String },
        status: { type: Number },
        statusText: { type: String },
        requestType: { type: String },
        requestId: { type: Schema.Types.ObjectId },
        requestPayload: { type: mongoose.Schema.Types.Mixed },
        responsePayload: { type: mongoose.Schema.Types.Mixed },
        startTime: { type: Date },
        endTime: { type: Date },
        duration: { type: Number },
        requestSize: { type: Number },
        responseSize: { type: Number },
        responseType: { type: String }, 
        error: { type: Boolean },
        sensitiveResponse: { type: Boolean, required: true, default: false, },
    }, { timestamps: true })

    const QueueStatSchema = new mongoose.Schema({
        active: { type: Boolean, default: true },
        sub: { type: String, required: true },
        instanceId: { type: Schema.Types.ObjectId, required: true },
        queueId: { type: Schema.Types.ObjectId, required: true },
        status: { type: String, enum: queueStatusValue },
        statusText: { type: String },
        error: { type: Boolean }
    }, { timestamps: true })

    const IntentSchema = new mongoose.Schema({
        active: { type: Boolean, default: true },
        sub: { type: String, required: true },
        status: { type: String, enum: ['started','completed'], default: 'started' },
        projectId: { type: Schema.Types.ObjectId, required: true },
        intentType: { type: String, enum: ['upgrade','datatransfer'], required: true, },
        
        product: { type: String, enum: ['standard','developer','professional','gb'], required: true, },
        price: { type: String, type: Number, required: true },

        paymentIntentId: { type: String },
        coupon: { type: String, },
    }, { timestamps: true })

    return {
        'Token': new mongoose.model('Token', TokenSchema),
        'Usage': new mongoose.model('Usage', UsageSchema),
        'UsageDay': new mongoose.model('UsageDay', UsageDaySchema),
        'Billing': new mongoose.model('Billing', BillingSchema),
        'Setting': new mongoose.model('Setting', SettingSchema),
        'Feedback': new mongoose.model('Feedback', FeedbackSchema),
        'Storage': new mongoose.model('Storage', StorageSchema),
        'Project': new mongoose.model('Project', ProjectSchema),
        'Member': new mongoose.model('Member', MemberSchema),
        'Request': new mongoose.model('Request', RequestSchema),
        'Workflow': new mongoose.model('Workflow', WorkflowSchema),
        'Instance': new mongoose.model('Instance', InstanceSchema),
        'Stat': new mongoose.model('Stat', StatSchema),
        'QueueStat': new mongoose.model('QueueStat', QueueStatSchema),
        'Queue': new mongoose.model('Queue', QueueSchema),
        'Intent': new mongoose.model('Intent', IntentSchema),

        'RequestSchema': RequestSchema,
    }
}