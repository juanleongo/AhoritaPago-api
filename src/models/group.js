const { Schema, model } = require('mongoose');

const GroupSchema = new Schema({
    name: {
        type: String,
        required: [true, 'El nombre es obligatorio'],
        trim: true
    },
    state: {
        type: Boolean,
        default: true
    },
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    code: {
        type: String,
        required: true,
        unique: true
    }
});

GroupSchema.index(
    { members: 1, state: 1, _id: -1 },
    { name: 'group_member_active_page' }
);

module.exports = model('Group', GroupSchema);
