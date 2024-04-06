const express = require('express');
const compController = require('../controllers/compController')
const router = express.Router();

router.get('/home', compController.get_home);
router.get('/createcomp', compController.get_createcomp);
router.get('/:id', compController.get_comp);
router.get('/:id/createQuestion', compController.get_createQuestion);
router.get('/:id/:index', compController.get_announcement);

router.post('/home', compController.post_createcomp);
router.post('/:id', compController.post_announcement);
router.post('/:id/:index', compController.post_comment);

router.delete('/:id/delete', compController.delete_comp);
router.delete('/:id/:index/delete', compController.delete_announcement);


module.exports =router;