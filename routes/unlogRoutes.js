const express = require('express');
const unlogController = require('../controllers/unlogController')
const router = express.Router();

router.get('/', unlogController.get_index);
router.get('/login', unlogController.get_login);
router.get('/signup', unlogController.get_signup);
router.get('/forgotpass', unlogController.get_forgotpass);
router.get('/signout', unlogController.get_signout);
router.get('/profile/:userID', unlogController.get_profile);

router.post('/login', unlogController.post_login);
router.post('/signup', unlogController.post_signup);
router.post('/resetPassword', unlogController.post_resetPassword);
router.post('/profile/update', unlogController.post_updateUserProfile);

module.exports =router;