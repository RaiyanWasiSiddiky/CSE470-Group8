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
    },
    competitions: [{ 
        type: Schema.Types.ObjectID,
        ref: 'Competition'
    }]
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

const applicantSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    }
}, { timestamps: true });


const commentSchema = new Schema({
    content: {
        type: String,
        required: true
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User' 
    },
    authorUsername: String, // Add a field to store the username
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const announcementSchema = new Schema({
    content: {
        type: String,
        required: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    createdByUsername: String, // Add a field to store the username
    createdAt: {
        type: Date,
        default: Date.now
    },
    comments: [commentSchema] 
});

const questionSetSchema = new Schema({
    questions: [String], 
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    createdByUsername: String, // Add a field to store the username
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
    participants: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }],
    hostUsername: String, // Add a field to store the username
    judges: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    announcements: [announcementSchema], 
    questionSets: [questionSetSchema] 
}, { timestamps: true });

// whyyyyyy does mongoose capitalization+pluralization exist man whyyy
const User = mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Applicant = mongoose.model('Applicant', applicantSchema);
const Competition = mongoose.model('Competition', competitionSchema);

module.exports = {
    User,
    Admin,
    Applicant,
    Competition
};