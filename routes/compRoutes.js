const express = require('express');
const compController = require('../controllers/compController')
const router = express.Router();

router.get('/home', compController.get_home);
router.get('/applyhost', compController.get_applyhost);
router.get('/createcomp', compController.get_createcomp);
router.get('/myComps/:userId', compController.get_myComps);
router.get('/judgeSubmission/:compId/:announcementIndex/:submissionIndex', compController.get_judgeSubmission);
router.get('/:id', compController.get_comp);
router.get('/:compId/addjudges', compController.get_addJudge);
router.get('/:id/createQuestion', compController.get_createQuestion);
router.get('/:id/:index', compController.get_announcement);
router.get('/:compId/:announcementIndex/answerQuestion', compController.get_answerQuestion);

router.post('/applyhost', compController.post_applyhost);
router.post('/home', compController.post_createcomp);
router.post('/join', compController.post_joinCompetition);
router.post('/upload/:compId', compController.post_submitSubmissionAnswer);
router.post('/rate/:hostId', compController.post_rate);
router.post('/scoreMCQ/:compId/:userId', compController.post_scoreMCQ);
router.post('/scoreSubmission/:compId/:announcementIndex/:submissionIndex/:userId', compController.post_scoreSubmission);
router.post('/:id', compController.post_announcement);
router.post('/:competitionId/end', compController.post_endCompetition);
router.post('/:compId/judgeAccept', compController.post_judgeAccept);
router.post('/:compId/judgeReject', compController.post_judgeReject);
router.post('/:compId/createQuestion', compController.post_createQuestion);
router.post('/:id/:index', compController.post_comment);
router.post('/:compId/addJudge/:userId', compController.post_requestJudge);

router.delete('/:id/delete', compController.delete_comp);
router.delete('/:id/:index/delete', compController.delete_announcement);
router.delete('/:id/:index/:commentIndex/delete', compController.delete_comment);


module.exports =router;