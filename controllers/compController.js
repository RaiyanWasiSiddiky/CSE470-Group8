const {User, Admin, Applicant, Competition} = require('../models/schemas');
const timeutils = require('../timeutensils.js');
const upload  = require('../multerConfig'); // Adjust the path as needed


const get_home = (req, res) => {
  const user = req.session.user;
  const searchQuery = req.query.search;

  if (searchQuery) {
    // If there is a search query, filter competitions based on the query
    Competition.find({
        $or: [
          { title: { $regex: searchQuery, $options: 'i' } }, // Case-insensitive title search
          { genre: { $regex: searchQuery, $options: 'i' } }, // Case-insensitive genre search
          // Add more fields to search here if needed
        ]
    })
    .sort({ createdAt: -1 })
    .then((result) => {
      res.render('competitions/home', { title: "Search Results", comps: result, user: user });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    });
  } else {
    // If there is no search query, fetch all competitions
    Competition.find()
    .populate("host")
    .sort({ createdAt: -1 })
    .then((result) => {
        res.render('competitions/home', { title: "All Competitions", comps: result, user: user });
    })
    .catch((err) => {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    });
  }
};


const get_applyhost = (req, res) => {
  const user = req.session.user;
  res.render('competitions/applyhost', { title: 'Apply for Host', user });
};


const post_applyhost = async (req, res) => {
  try {

    const { reason } = req.body;
    const user = req.session.user; 

    const newApplicant = new Applicant({
        user: user._id,
        username: user.username,
        email: user.email,
        reason
    });

    await newApplicant.save();

    res.status(201).json({ message: 'Application submitted successfully' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const get_comp = (req, res) => {
  const user = req.session.user;
  const id = req.params.id;
  Competition.findById(id)
    .populate("participants")
    .populate("host")
    .populate({
      path: "judges",
      populate: { path: "user" } 
    })
    .then((result) => {
      // Sort announcements in descending order based on createdAt field
      // sorting kinda messes up the whole thing unfortunately cz i used index to get announcements instead of the announcement ID Sighhhhhh
      // result.announcements.sort((a, b) => b.createdAt - a.createdAt);
      res.render('competitions/compDets', { comp: result, getTimeSince: timeutils.getTimeSince, getTimeLeft: timeutils.getTimeLeft, title: result.title, user: user });
    })
    .catch((err) => {
      console.log(err);
      res.status(404).render('404', { title: "Competition not found" });
    });
};


const get_createcomp = function(req, res){
  const user = req.session.user;
  res.render('competitions/createcomp', { title:"Create", user:user });
};


const post_createcomp = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { title, genre, about } = req.body;

    const user = await User.findById(userId);

    const newCompetition = new Competition({
        title,
        genre,
        about,
        host: user._id,
        hostUsername: user.username,
    });

    newCompetition.judges.push({ user: user._id, judgeName: user.username,  status: 'accepted' });

    await newCompetition.save();

    user.competitions.push(newCompetition._id);
    await user.save();

    res.redirect(`/competitions/home`);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const post_joinCompetition = async (req, res) => {
  try {
    const { compId } = req.body;
    const userId = req.session.user._id;

    await User.findByIdAndUpdate(userId, { $addToSet: { competitions: compId } });

    await Competition.findByIdAndUpdate(compId, { $addToSet: { participants: userId } });

    const competition = await Competition.findById(compId).populate('host');

    // Create notification 
    const notificationContent = `${req.session.user.username} has joined ${competition.title}`;

    // Update host's notifications
    await User.findByIdAndUpdate(competition.host._id, { $push: { notifications: { type: 'join', content: notificationContent, createdAt: Date.now() } } });

    // res.redirect(`/competitions/myComps/${userId}`);
    // having to do this because redirect not updating data for some reason
    res.redirect(`/login`);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const get_myComps = async (req, res) => {
  try {
    const userID = req.params.userId;

    const user = await User.findById(userID).populate('competitions');

    // console.log(user);
    
    res.render('competitions/myComps', { user, title: "My competitions" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const get_createQuestion = async (req, res) => {
  try {
    const user = req.session.user;
    const compId = req.params.id;
    const type = req.query.type || 'submission'; // Default to submission if type is not provided
    const numQuestions = req.query.numQuestions || 1; // Default to 1 question if numQuestions is not provided

    const competition = await Competition.findById(compId);
    if (!competition) {
      res.status(404).render('404', { title: "Competition not found" });
    }
    res.render('competitions/createQuestion', { compId, title: competition.title, numQuestions, type, user:user });
  
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const post_createQuestion = async (req, res) => {
  try {
    const { questionTitle, deadline, type } = req.body;
    let questions = [];

    // if submission push just question
    if (type === 'submission') {
      questions.push({
        question: req.body.submissionQuestion,
        answers: null,
        correctAnswer: null
      });
      // if short push questions in loop
    } else if (type === 'short') {
      for (let i = 1; i <= req.body.numQuestions; i++) {
        const question = req.body[`question${i}`];
        questions.push({
          question: question,
          answers: null,
          correctAnswer: null
        });
      }
      // if mcq push questions, answers and correct answers in loop
    } else if (type === 'mcq') {
      for (let i = 1; i <= req.body.numQuestions; i++) {
        const question = req.body[`question${i}`];
        const answers = [
          req.body[`answer1${i}`],
          req.body[`answer2${i}`],
          req.body[`answer3${i}`],
          req.body[`answer4${i}`]
        ]
        const correctAnswer = req.body[`correctAnswer${i}`] 
        questions.push({
          question: question,
          answers: answers,
          correctAnswer: correctAnswer
        });
      }
    }

    // console.log(questions);

    // Create the question set
    const questionSet = {
      title: questionTitle,
      deadline: deadline,
      type: type,
      questions: questions
    };

    // Create the announcement
    const newannouncement = {
      type: 'question',
      content: questionTitle,
      createdBy: req.session.user._id,
      createdByUsername: req.session.user.username,
      questionSet: questionSet
    };

    const competition = await Competition.findById(req.params.compId);

    await Competition.findByIdAndUpdate(req.params.compId, {
      $push: { announcements: newannouncement },
    });

    // Create notification content
    const notificationContent = `There is a new Question Set in ${competition.title}`;

    // Update notifications for all participants
    for (const participantId of competition.participants) {
      await User.findByIdAndUpdate(participantId, { $push: { notifications: { type: 'question', content: notificationContent, createdAt: new Date() } } });
    }

    res.redirect(`/competitions/${req.params.compId}`);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const post_announcement = async (req, res) => {
  try {
    const user = req.session.user;
    const compId = req.params.id;
    const textContent = req.body.text_content;

    const competition = await Competition.findById(compId);

    if (!competition) {
      res.status(404).render('404', { title: "Competition not found" });
    }

    const newAnnouncement = {
        content: textContent,
        createdBy: user._id,
        createdByUsername: user.username,
        createdAt: new Date()
    };

    competition.announcements.push(newAnnouncement);

    await competition.save();

    // Create notification content
    const notificationContent = `There is a new announcement in ${competition.title}`;

    // Update notifications for all participants
    for (const participantId of competition.participants) {
      await User.findByIdAndUpdate(participantId, { $push: { notifications: { type: 'announcement', content: notificationContent, createdAt: new Date() } } });
    }

    res.redirect(`/competitions/${compId}`);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const get_announcement = async (req, res) => {
  try {
    const user = req.session.user;
    const compId = req.params.id;
    const announcementIndex = req.params.index;

    const competition = await Competition.findById(compId); //.populate('judges.user');
    if (!competition) {
      res.status(404).render('404', { title: "Competition not found" });
    }

    if (isNaN(announcementIndex) || announcementIndex < 0 || announcementIndex >= competition.announcements.length) {
        return res.status(400).json({ error: 'Invalid announcement index' });
    }

    const announcement = competition.announcements[announcementIndex];

    res.render('competitions/announcementDets', { comp: competition, getTimeSince: timeutils.getTimeSince, getTimeLeft: timeutils.getTimeLeft, title: competition.title, announcement, announcementIndex, user:user });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const post_comment = async (req, res) => {
  try {
    const user = req.session.user;
    const compId = req.params.id;
    const announcementIndex = req.params.index;
    const { comment_content } = req.body;

    const competition = await Competition.findById(compId);
    if (!competition) {
      res.status(404).render('404', { title: "Competition not found" });
    }

    if (announcementIndex < 0 || announcementIndex >= competition.announcements.length) {
        return res.status(400).json({ error: 'Invalid announcement index' });
    }

    const newComment = {
        content: comment_content,
        author: user._id,
        authorUsername: user.username,
        createdAt: new Date()
    };

    competition.announcements[announcementIndex].comments.push(newComment);

    await competition.save();

    res.redirect(`/competitions/${compId}/${announcementIndex}`);
    // res.status(200).json({ message: 'Comment posted successfully' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const post_endCompetition = async (req, res) => {
  const competitionId = req.params.competitionId;
  const userId = req.session.user._id;

  try {
      const competition = await Competition.findById(competitionId);
      if (!competition) {
        res.status(404).render('404', { title: "Competition not found" });
      }

      competition.finished = true;

      const user = await User.findById(userId);

      // Create new announcement
      const announcementContent = `${competition.title} has ended.\n\n`;

      // Sort scores in descending order
      const sortedScores = competition.scores.sort((a, b) => b.score - a.score);

      let scoresContent = "These are the Rankings:\n";
      sortedScores.forEach((score, index) => {
          scoresContent += `${index + 1}. ${score.username} - ${score.score}\n`;
      });

      const announcement = {
        content: announcementContent + scoresContent,
        createdBy: user._id,
        createdByUsername: user.username,
        createdAt: new Date()
      };


      competition.announcements.push(announcement);


      await competition.save();

      // Send notifications to participants
      const participants = await User.find({ _id: { $in: competition.participants } });

      participants.forEach(async (participant) => {
        const score = sortedScores.find((score) => score.user.toString() === participant._id.toString());
        const rank = sortedScores.findIndex((score) => score.user.toString() === participant._id.toString()) + 1;
        const notificationContent = `${competition.title} has ended.\n You have a total score of ${score ? score.score : 0} and placed rank ${rank}.`;

        await User.findByIdAndUpdate(participant._id, { $push: { notifications: { type: 'end', content: notificationContent, createdAt: Date.now() } } });
      });

      res.redirect(`/competitions/${competitionId}`);

  } catch (error) {
      console.error('Error ending competition:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
};


const post_rate = async (req, res) => {
  const { hostId } = req.params;
  const { rating, review } = req.body;
  const currentUserId = req.session.user._id;

  try {

      const host = await User.findById(hostId);
      const currentUser = await User.findById(currentUserId);

      if (!host || !currentUser) {
          return res.status(404).render('404', { title: 'User not found' });
      }

      host.reviews.push({
          reviewerId: currentUser._id,
          reviewerUsername: currentUser.username,
          content: review,
          rating: rating
      });

      // Calculate the new average rating
      const totalRatings = host.reviews.reduce((total, review) => total + review.rating, 0);
      const avgRating = totalRatings / host.reviews.length;
      host.avgRating = avgRating;

      await host.save();

      res.status(200).json({ message: 'Rating and review submitted successfully' });
  } catch (error) {
      // Handle errors
      console.error('Error submitting rating and review:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
};


const delete_announcement = async (req, res) => {
  try {
    const user = req.session.user;
    const compId = req.params.id;
    const announcementIndex = req.params.index;

    const competition = await Competition.findById(compId);
    if (!competition) {
      res.status(404).render('404', { title: "Competition not found" });
    }

    if (isNaN(announcementIndex) || announcementIndex < 0 || announcementIndex >= competition.announcements.length) {
        return res.status(400).json({ error: 'Invalid announcement index' });
    }


    competition.announcements.splice(announcementIndex, 1);

    await competition.save();

    res.status(200).json({ message: 'Announcement deleted successfully' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const delete_comp = async (req, res) => {
  try {
    const id = req.params.id;

    const deletedCompetition = await Competition.findById(id);

    if (!deletedCompetition) {
      res.status(404).render('404', { title: "Competition not found" });
    }

    // Find all users who have the competition ID in their competitions field
    const usersToUpdate = await User.find({ competitions: id });

    // Remove the competition ID from each user's competitions field
    const updateUserPromises = usersToUpdate.map(async (user) => {
      user.competitions = user.competitions.filter(compId => compId.toString() !== id);
      await user.save();
    });

    // Wait for all users to be updated
    await Promise.all(updateUserPromises);

    // Delete the competition document
    await Competition.findByIdAndDelete(id);

    res.json({ redirect: '/competitions/home' });
    // res.redirect('/competitions/home');
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const delete_comment = async (req, res) => {
  try {
      const { id, index, commentIndex } = req.params;

      const competition = await Competition.findById(id);

      if (!competition || index < 0 || index >= competition.announcements.length) {
          return res.status(404).render('404', { title: "Competition or Announcement not found" });
      }

      const announcement = competition.announcements[index];
      announcement.comments.splice(commentIndex, 1);

      await competition.save();

      res.status(200).json({ message: 'Comment deleted successfully' });

  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
};


const get_addJudge = async (req, res) => {
  try {
    const user = req.session.user;
    const compId = req.params.compId;
    const competition = await Competition.findById(compId);
    if (!competition) {
      res.status(404).render('404', { title: "Competition not found" });
    }
    
    // Get followers who are followed by the current user and also follow the current user and also are not judges of the competition
    const followers = await User.find({
      $and: [
        { _id: { $in: user.followers } },
        { _id: { $in: user.follows } },
        { _id: { $nin: competition.judges.map(judge => judge.user) } }
      ]
    });

    res.render('competitions/addJudges', { title: `${competition.title} - Add Judges`, followers, compId, user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};


const post_requestJudge = async (req, res) => {
  try {
    const { compId, userId } = req.params;

    const competition = await Competition.findById(compId).populate('host');
    if (!competition) {
      res.status(404).render('404', { title: "Competition not found" });
    }

    if (competition.judges.some(judge => judge.user.equals(userId))) {
      return res.status(400).json({ error: "User is already a judge" });
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).render('404', { title: "User not found" });
    }

    competition.judges.push({ user: userId, judgeName: user.username, status: "pending" });
    await competition.save();

    // Create a notification 
    const notificationContent = `${competition.host.username} has requested you to judge ${competition.title}`;
    user.notifications.push({
      type: "judge request",
      content: notificationContent,
      comp: competition._id
    });
    await user.save();

    res.status(200).json({ message: "Judge request sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


const post_judgeAccept = async (req, res) => {
  try {
    const compId = req.params.compId;
    const user = await User.findById(req.session.user._id);

    if (!user) {
      return res.status(404).render('404', { title: "User not found" });
    }

    const competition = await Competition.findById(compId).populate('host');
    if (!competition) {
      return res.status(404).render('404', { title: "Competition not found" });
    }

    const notification = user.notifications.find(notification => {
      return notification.comp && notification.comp.toString()===compId && notification.type === "judge request";
    });

    if (!notification) {
      return res.status(404).render('404', { title: "Notification not found" });
    }

    // Update the notification type to "accept judge" to change color
    notification.type = "accept judge";

    await user.save();

    // console.log(competition.judges);

    // Create a notification for the competition host
    const notificationContent = `${user.username} has accepted to judge ${competition.title}`;
    competition.host.notifications.push({
      type: "accept judge",
      content: notificationContent
    });

    await competition.host.save();

    // Update the status of the judge to "accepted"
    const judgeIndex = competition.judges.findIndex(judge => judge.user.toString() === user._id.toString());
    if (judgeIndex !== -1) {
      competition.judges[judgeIndex].status = "accepted";
    }

    await competition.save();

    res.status(200).json({ message: "Judge request accepted successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


const post_judgeReject = async (req, res) => {
  try {
    const compId = req.params.compId;
    const user = await User.findById(req.session.user._id);

    if (!user) {
      return res.status(404).render('404', { title: "User not found" });
    }

    const competition = await Competition.findById(compId).populate("host");
    if (!competition) {
      return res.status(404).render('404', { title: "Competition not found" });
    }

    // Find the notification corresponding to the judge request
    const notification = user.notifications.find(notification => {
      return notification.comp && notification.comp.toString()===compId && notification.type === "judge request";
    });
    if (!notification) {
      return res.status(404).render('404', { title: "Notification not found" });
    }

    // Update the notification type to "reject judge" to change color
    notification.type = "reject judge";
    await user.save();

    // Create a notification for the competition host
    const notificationContent = `${user.username} has rejected to judge ${competition.title}`;
    competition.host.notifications.push({
      type: "reject judge",
      content: notificationContent
    });
    await competition.host.save();

    // Remove the judge from the competition
    competition.judges = competition.judges.filter(judge => !(judge.user.toString()===user._id.toString()));
    await competition.save();

    res.status(200).json({ message: "Judge request rejected successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


const get_answerQuestion = async (req, res) => {

  const { compId, announcementIndex } = req.params;
  const user = req.session.user;

  const competition = await Competition.findById(compId);

  const announcement = competition.announcements[parseInt(announcementIndex)];

  const questionSet = announcement.questionSet;


  res.render('competitions/answer', { compId, announcementIndex, questionSet, user, title: `Answering ${questionSet.title}`});
};


const post_submitSubmissionAnswer = async (req, res) => {
  const { user } = req.session;
  const { question } = req.body;

  try {
      const competitionId = req.params.compId; 
      const competition = await Competition.findById(competitionId);

      // Handle file upload using Multer middleware
      // console.log(upload);
      upload.single('file')(req, res, async function (err) {
        if (err) {
            console.error('Error uploading file:', err);
            return res.status(400).send('Error uploading file');
        }

        // Access uploaded file path using req.file
        const filePath = req.file.path;

        const submissionData = {
            user: user._id,
            username: user.username,
            answers: [{
                question: question,
                file: filePath 
            }],
            uploadedAt: new Date()
        };

        competition.announcements[req.body.announcementIndex].questionSet.submittedUsers.push(user._id);
        competition.announcements[req.body.announcementIndex].questionSet.submissions.push(submissionData);

        await competition.save();

        res.redirect(`/competitions/${competitionId}`); 
      });

  } catch (error) {
      console.error('Error submitting answer:', error);
      res.status(500).send('Error submitting answer');
  }
};


const get_judgeSubmission = async (req, res) => {
  try {
      const { compId, announcementIndex, submissionIndex } = req.params;

      const competition = await Competition.findById(compId);
      if (!competition) {
          return res.status(404).render('404', { title: "Competition not found" });
      }

      const announcement = competition.announcements[announcementIndex];
      if (!announcement) {
          return res.status(404).render('404', { title: "Announcement not found" });
      }

      const submission = announcement.questionSet.submissions[submissionIndex];
      if (!submission) {
          return res.status(404).render('404', { title: "Submission not found" });
      }


      res.render('judgeSubmission', { competition, announcement, submission });

  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
  }
};


const post_scoreSubmission = async (req, res) => {
  try {
      const { compId, announcementIndex, submissionIndex, userId } = req.params;
      const score = req.body.score;
      const user = req.session.user;

      // console.log(score);

      if (!score || isNaN(score) || score < 1 || score > 100) {
          return res.status(400).send('Invalid score. Please enter a number between 1 and 100.');
      }

      const competition = await Competition.findById(compId);
      const user1 = await User.findById(userId);

      // Check if the user already has a score
      const existingScoreIndex = competition.scores.findIndex(score => score.user.toString() === userId);
      if (existingScoreIndex !== -1) {
          // User already has a score, update it
          competition.scores[existingScoreIndex].score += score;
      } else {
          // User doesn't have a score, add a new entry
          competition.scores.push({ user: userId, username: user1.username, score: score });
      }

      competition.announcements[announcementIndex].questionSet.submissions[submissionIndex].scoredBy = user._id;
      
      await competition.save();

      res.redirect(`/competitions/${compId}/${announcementIndex}`);
      // res.status(200).send('Submission scored successfully.');

  } catch (error) {
      console.error('Error scoring submission:', error);
      res.status(500).send('Error scoring submission.');
  }
};


const post_scoreMCQ = async (req, res) => {
  try {
    const { compId, userId } = req.params;
    const { questionType, announcementIndex } = req.body;
    const userAnswers = req.body; 

    const competition = await Competition.findById(compId);
    const announcement = competition.announcements[announcementIndex];

    const user1 = await User.findById(userId);

    let totalQuestions = 0;
    let correctAnswers = 0;

    announcement.questionSet.questions.forEach((question, questionIndex) => {
      const userAnswer = userAnswers[`answer${questionIndex + 1}`];
      const correctAnswer = question.correctAnswer; 

      console.log(userAnswer, correctAnswer);

      if (userAnswer === correctAnswer) {
        correctAnswers++;
      }

      totalQuestions++;
    });

    // Calculate score (number of correct answers / total questions)
    const score = (correctAnswers / totalQuestions) * 100; 

    console.log(score);

    // Check if the user already has a score
    const existingScoreIndex = competition.scores.findIndex(score => score.user.toString() === userId);
    if (existingScoreIndex !== -1) {
      // User already has a score, overwrite it
      competition.scores[existingScoreIndex].score += score;
    } else {
      // User doesn't have a score, add a new entry
      competition.scores.push({ user: userId, username: user1.username, score: score });
    }

    announcement.questionSet.submittedUsers.push(user1._id);

    await competition.save();

    res.redirect(`/competitions/${compId}/${announcementIndex}`);
    
  } catch (error) {
    console.error('Error scoring MCQ submission:', error);
    res.status(500).send('Error scoring MCQ submission.');
  }
};


module.exports = {
  get_home,
  get_comp,
  get_createcomp,
  get_applyhost,
  post_applyhost,
  post_createcomp,
  delete_comp,
  post_announcement,
  delete_announcement,
  get_announcement,
  post_comment,
  get_createQuestion,
  delete_comment,
  post_joinCompetition,
  get_myComps,
  post_endCompetition,
  post_rate,
  get_addJudge,
  post_requestJudge,
  post_judgeAccept,
  post_judgeReject,
  post_createQuestion,
  get_answerQuestion,
  post_submitSubmissionAnswer,
  get_judgeSubmission,
  post_scoreSubmission,
  post_scoreMCQ
};