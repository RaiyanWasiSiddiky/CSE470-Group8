const express = require('express');
const compController = require('../controllers/compController')
const router = express.Router();

router.get('/home', compController.get_home);
router.get('/applyhost', compController.get_applyhost);
router.get('/createcomp', compController.get_createcomp);
router.get('/myComps', compController.get_myComps);
router.get('/:id', compController.get_comp);
router.get('/:id/createQuestion', compController.get_createQuestion);
router.get('/:id/:index', compController.get_announcement);

router.post('/applyhost', compController.post_applyhost);
router.post('/home', compController.post_createcomp);
router.post('/join', compController.post_joinCompetition);
router.post('/:id', compController.post_announcement);
router.post('/:id/:index', compController.post_comment);

router.delete('/:id/delete', compController.delete_comp);
router.delete('/:id/:index/delete', compController.delete_announcement);
router.delete('/:id/:index/:commentIndex/delete', compController.delete_comment);


module.exports =router;