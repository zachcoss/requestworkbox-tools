// accepts the mongoose and autopopulate libraries
// from each instance
module.exports = (mongoose, mongooseAutoPopulate, nodeEnv) => {
    if (!mongoose || !mongooseAutoPopulate) {
        throw new Error('Missing Required Packages')
    }
    
    const 
        Schema = mongoose.Schema;

    mongoose.plugin(mongooseAutoPopulate)

    const queueStatusValue = ['received', 'uploading', 'pending', 'queued', 'starting', 'initializing', 'loading', 'running', 'webhook', 'complete', 'error', 'archived']

    const KeyValueSchema = new mongoose.Schema({
        key: String,
        value: String,
        valueType: { type: String, enum: ['textInput','storage','runtimeResult','incomingField'] }
    })

    const KeyValueDefault = () => {
        return {
            key: '',
            value: '',
            valueType: 'textInput'
        }
    }

    const QueueSchema = new mongoose.Schema({
        active: { type: Boolean, default: true, required: true  },
        sub: { type: String, required: true },
        instance: { type: Schema.Types.ObjectId, required: true  },
        workflow: { type: Schema.Types.ObjectId, required: true  },
        workflowName: { type: String, required: true  },
        status: { type: String, enum: queueStatusValue },
        queueType: { type: String, enum: ['queue', 'schedule', 'return'] },
        date: { type: Date, },
        storage: { type: String  },
        dev: { type: Boolean, default: false, required: true },
        stats: [{
            type: Schema.Types.ObjectId,
            ref: 'QueueStat',
            autopopulate: true
        }],
    }, { timestamps: true })

    const QueueDevSchema = new mongoose.Schema({
        active: { type: Boolean, default: true, required: true  },
        sub: { type: String, required: true },
        instance: { type: Schema.Types.ObjectId, required: true  },
        workflow: { type: Schema.Types.ObjectId, required: true  },
        workflowName: { type: String, required: true  },
        status: { type: String, enum: queueStatusValue },
        queueType: { type: String, enum: ['queue', 'schedule', 'return'] },
        date: { type: Date, },
        storage: { type: String  },
        dev: { type: Boolean, default: true, required: true },
        stats: [{
            type: Schema.Types.ObjectId,
            ref: 'QueueStat',
            autopopulate: true
        }],
    }, { timestamps: true })

    const BillingSchema = new mongoose.Schema({
        active: { type: Boolean, default: true },
        sub: { type: String, required: true },
        accountType: { type: String, default: 'free', enum: ['free','standard','developer','professional'] },
        // return workflow
        returnWorkflowLast: { type: Date },
        returnWorkflowCount: { type: Number },
        // queue workflow
        queueWorkflowLast: { type: Date },
        queueWorkflowCount: { type: Number },
        // schedule workflow
        scheduleWorkflowLast: { type: Date },
        scheduleWorkflowCount: { type: Number },

        stripeCustomerId: { type: String },
    }, { timestamps: true })

    const ChargeSchema = new mongoose.Schema({
        active: { type: Boolean, default: true },
        sub: { type: String, required: true },
        status: { type: String, enum: ['ready','calculating','error'] },
        invoiceMonth: { type: String, enum: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] },
        invoiceYear: { type: String, enum: ['2020','2021'] },
        invoiceType: { type: String, enum: ['storage','request','app','api'] },
        invoiceFrequency: { type: String, enum: ['monthly'] },
        invoiceAmount: { type: String },
        invoiceMeasurement: { type: String, enum: ['kb','ms','cent',] },
        invoiceDetail: { type: String, },
        invoiceId: { type: String, },
        invoiceLastCalculated: { type: Date, },
    }, { timestamps: true })

    const InvoiceSchema = new mongoose.Schema({
        active: { type: Boolean, default: true },
        sub: { type: String, required: true },
        status: { type: String, enum: ['ready','calculating','error'] },
        charges: {
            type: [ ChargeSchema ],
        },
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
        project: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Project',
        },
        storageType: { type: String, enum: ['text', 'file'] },
        fieldname: { type: String, },
        originalname: { type: String, },
        encoding: { type: String, },
        mimetype: { type: String, },
        filename: { type: String, },
        size: { type: Number, },
        usage: [{
            type: Schema.Types.ObjectId,
            ref: 'Usage',
            autopopulate: true
        }],
        storageValue: Schema.Types.Mixed,
        totalBytesDown: { type: Number },
        totalBytesUp: { type: Number },
        totalMs: { type: Number },
    }, { timestamps: true })

    const ProjectSchema = new mongoose.Schema({
        active: { type: Boolean, default: true },
        sub: { type: String, required: true },
        name: { type: String, required: true, default: 'Untitled Project' },
    }, { timestamps: true })

    const RequestSchema = new mongoose.Schema({
        active: { type: Boolean, default: true },
        sub: { type: String, required: true },
        project: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Project',
        },
        url: {
            method: { type: String, default: 'GET'},
            url: { type: String, default: 'https://api.com'},
            name: { type: String, default: 'API'},
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
    }, { timestamps: true })

    const WorkflowSchema = new mongoose.Schema({
        active: { type: Boolean, default: true },
        sub: { type: String, required: true },
        name: { type: String, default: 'Untitled Workflow' },
        project: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Project',
        },
        
        tasks: {
            type: [new mongoose.Schema({
                requestId: Schema.Types.ObjectId,
            })],
            default: [{}],
        },
        webhookRequestId: { type: Schema.Types.ObjectId, },
    }, { timestamps: true })

    const InstanceSchema = new mongoose.Schema({
        active: { type: Boolean, default: true },
        sub: { type: String, required: true },
        project: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Project',
        },
        workflow: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Workflow',
        },
        workflowName: { type: String },
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
    }, { timestamps: true })

    const StatSchema = new mongoose.Schema({
        active: { type: Boolean, default: true },
        instance: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Instance',
        },
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
        error: { type: Boolean }
    }, { timestamps: true })

    const QueueStatSchema = new mongoose.Schema({
        active: { type: Boolean, default: true },
        sub: { type: String, required: true },
        instance: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Instance',
        },
        queue: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Queue',
        },
        status: { type: String, enum: queueStatusValue },
        statusText: { type: String },
        error: { type: Boolean }
    }, { timestamps: true })

    return {
        'Usage': new mongoose.model('Usage', UsageSchema),
        'Billing': new mongoose.model('Billing', BillingSchema),
        'Feedback': new mongoose.model('Feedback', FeedbackSchema),
        'Storage': new mongoose.model('Storage', StorageSchema),
        'Project': new mongoose.model('Project', ProjectSchema),
        'Request': new mongoose.model('Request', RequestSchema),
        'Workflow': new mongoose.model('Workflow', WorkflowSchema),
        'Instance': new mongoose.model('Instance', InstanceSchema),
        'Stat': new mongoose.model('Stat', StatSchema),
        'QueueStat': new mongoose.model('QueueStat', QueueStatSchema),

        'Queue': (() => {
            if (nodeEnv === 'production') {
                return new mongoose.model('Queue', QueueSchema)
            } else if (nodeEnv === 'development') {
                return new mongoose.model('QueueDev', QueueDevSchema)
            } else {
                throw new Error('Missing node env')
            }
        })(),

        'RequestSchema': RequestSchema,
    }
}