const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    fullname: {
        type: String,
        required: true
    },
    username: {
        type: String,
        unique: true,
        required: true,
        minlength: 5,
        maxlength: 10
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    password:{
        type: String,
        required: true
    },
    dob:{
        type: Date,
        required: true 
    },
    joiningDate:{
        type: Date,
        default: Date.now
    },
    hostAuth:{
        type: Boolean,
        default: false
    },
    friends: [{
        type: Schema.Types.ObjectID,
        ref: "User"
    }],
    securityQuestions: [{
        question: {
            type: String,
            required: true
        },
        answer: {
            type: String,
            required: true
        }
    }],
    isAdmin: {
        type: Boolean,
        default: false
    }
});

const adminSchema = new Schema({
    username: {
        type: String,
        unique: true,
        required: true,
        minlength: 5,
        maxlength: 10
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    password:{
        type: String,
        required: true
    },
    hostAuth:{
        type: Boolean,
        default: true
    },
    isAdmin: {
        type: Boolean,
        default: true
    }
});


// for competitionSchema
const commentSchema = new Schema({
    content: {
        type: String,
        required: true
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User' 
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// for competitionSchema
const announcementSchema = new Schema({
    content: {
        type: String,
        required: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    comments: [commentSchema] 
});

// for competitionSchema
const questionSetSchema = new Schema({
    
    questions: [String], 
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const competitionSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    genre: {
        type: String,
        required: true
    },
    about: {
        type: String,
        required: true
    },
    host: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    judges: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    announcements: [announcementSchema], 
    questionSets: [questionSetSchema] 
}, { timestamps: true });


const User = mongoose.model('users', userSchema);
const Admin = mongoose.model('admins', adminSchema);
const Competition = mongoose.model('competitions', competitionSchema);

module.exports = {
    User,
    Admin,
    Competition
};