const express = require('express');
const adminController = require('../controllers/adminController')
const router = express.Router();

router.get('/adminUsers', adminController.get_adminUsers); 

router.delete('/:id/delete', adminController.delete_user);

module.exports =router;
