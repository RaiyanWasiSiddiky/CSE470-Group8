const {User, Admin, Applicant, Competition} = require('../models/schemas');
const timeutils = require('../timeutensils.js');
const { ObjectId } = require('mongoose').Types;

const get_home = (req, res) => {
  const user = req.session.user;
  const searchQuery = req.query.search;

  // Check if there is a search query
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
    // Extract user data and application reason from request body
    const { reason } = req.body;
    const user = req.session.user; // Assuming user data is available in the request object

    // Create a new applicant instance
    const newApplicant = new Applicant({
        user: user._id,
        username: user.username,
        email: user.email,
        reason
    });

    // Save the new applicant to the database
    await newApplicant.save();

    // Send a success response
    // res.json({ redirect: `/competitions/home` })
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
    // Extract competition details from the request body
    const userId = req.session.user._id;
    const { title, genre, about } = req.body;

    const user = await User.findById(userId);

    // Create a new competition instance
    const newCompetition = new Competition({
        title,
        genre,
        about,
        host: user._id,
        hostUsername: user.username,
    });

    newCompetition.judges.push({ user: user._id, judgeName: user.username,  status: 'accepted' });

    // Save the new competition to the database
    await newCompetition.save();

    // Add the comp._id of the newly created competition to the user's competitions array
    user.competitions.push(newCompetition._id);
    await user.save();

    // Redirect to the home page or display a success message
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
    
    // Update user's competitions array
    await User.findByIdAndUpdate(userId, { $addToSet: { competitions: compId } });

    // Update competition's participants array
    await Competition.findByIdAndUpdate(compId, { $addToSet: { participants: userId } });

    // Get the competition details including the host
    const competition = await Competition.findById(compId).populate('host');

    // Create notification content
    const notificationContent = `${req.session.user.username} has joined ${competition.title}`;

    // Update host's notifications
    await User.findByIdAndUpdate(competition.host._id, { $push: { notifications: { type: 'join', content: notificationContent, createdAt: Date.now() } } });

    // res.redirect(`/competitions/myComps/${userId}`);
    res.redirect(`/login`);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const get_myComps = async (req, res) => {
  try {
    const userID = req.params.userId;
    
    // Fetch user's competitions
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

    // If the type is submission, short, or mcq, add questions from request body
    if (type === 'submission') {
      questions.push({
        question: req.body.submissionQuestion,
        answers: null,
        correctAnswer: null
      });
    } else if (type === 'short') {
      for (let i = 1; i <= req.body.numQuestions; i++) {
        const question = req.body[`question${i}`];
        questions.push({
          question: question,
          answers: null,
          correctAnswer: null
        });
      }
    } else if (type === 'mcq') {
      // If the type is short or mcq, construct questions array from request body
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

    // Push the announcement into the competition schema
    await Competition.findByIdAndUpdate(req.params.compId, {
      $push: { announcements: newannouncement },
    });

    // Create notification content
    const notificationContent = `There is a new Question Set in ${competition.title}`;

    // Update notifications for all participants
    for (const participantId of competition.participants) {
      await User.findByIdAndUpdate(participantId, { $push: { notifications: { type: 'question', content: notificationContent, createdAt: new Date() } } });
    }

    // Redirect back to the same page after posting announcement
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

    // Find the competition by ID
    const competition = await Competition.findById(compId);

    if (!competition) {
      res.status(404).render('404', { title: "Competition not found" });
    }

    // Create a new announcement object
    const newAnnouncement = {
        content: textContent,
        createdBy: user._id,
        createdByUsername: user.username,
        createdAt: new Date()
    };

    // Push the new announcement to the announcements array
    competition.announcements.push(newAnnouncement);

    // Save the updated competition document
    await competition.save();

    // Create notification content
    const notificationContent = `There is a new announcement in ${competition.title}`;

    // Update notifications for all participants
    for (const participantId of competition.participants) {
      await User.findByIdAndUpdate(participantId, { $push: { notifications: { type: 'announcement', content: notificationContent, createdAt: new Date() } } });
    }

    // Redirect back to the same page after posting announcement
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

    // Find the competition by ID
    const competition = await Competition.findById(compId);
    if (!competition) {
      res.status(404).render('404', { title: "Competition not found" });
    }

    // Ensure the announcementIndex is a valid number
    if (isNaN(announcementIndex) || announcementIndex < 0 || announcementIndex >= competition.announcements.length) {
        return res.status(400).json({ error: 'Invalid announcement index' });
    }

    // Get the specific announcement using the index
    const announcement = competition.announcements[announcementIndex];

    // Render the announcement_details view with the announcement data
    res.render('competitions/announcementDets', { comp: competition, getTimeSince: timeutils.getTimeSince, title: competition.title, announcement, announcementIndex, user:user });

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

    // Find the competition by ID
    const competition = await Competition.findById(compId);
    if (!competition) {
      res.status(404).render('404', { title: "Competition not found" });
    }

    // Ensure the announcementIndex is within the valid range
    if (announcementIndex < 0 || announcementIndex >= competition.announcements.length) {
        return res.status(400).json({ error: 'Invalid announcement index' });
    }

    // Create a new comment object
    const newComment = {
        content: comment_content,
        author: user._id,
        authorUsername: user.username,
        createdAt: new Date()
    };

    // Add the new comment to the specified announcement's comments array
    competition.announcements[announcementIndex].comments.push(newComment);

    // Save the updated competition document
    await competition.save();

    // Respond with a success message
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
      await competition.save();

      const user = await User.findById(userId);

      // Create new announcement
      const announcement = {
        content: `${competition.title} has ended.`,
        createdBy: user._id, // Assuming user is logged in and you have access to session
        createdByUsername: user.username, // Assuming user is logged in and you have access to session
        createdAt: new Date()
      };

      // Add the announcement to the competition
      competition.announcements.push(announcement);
      await competition.save();

      // Redirect the user to the competition page
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
      // Find the host and the current user by their IDs
      const host = await User.findById(hostId);
      const currentUser = await User.findById(currentUserId);

      // Check if the host and current user exist
      if (!host || !currentUser) {
          return res.status(404).render('404', { title: 'User not found' });
      }

      // Add the rating and review to the host's reviews array
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

      // Save the updated host document
      await host.save();

      // Send a success response
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

    // Find the competition by ID
    const competition = await Competition.findById(compId);
    if (!competition) {
      res.status(404).render('404', { title: "Competition not found" });
    }

    // Ensure the announcementIndex is a valid number
    if (isNaN(announcementIndex) || announcementIndex < 0 || announcementIndex >= competition.announcements.length) {
        return res.status(400).json({ error: 'Invalid announcement index' });
    }

    // Remove the announcement from the array
    competition.announcements.splice(announcementIndex, 1);

    // Save the updated competition document
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

    // Find the competition document to be deleted
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

    // Send response indicating successful deletion
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

      // Find the competition by ID
      const competition = await Competition.findById(id);

      // Ensure the competition exists and the announcement index is valid
      if (!competition || index < 0 || index >= competition.announcements.length) {
          return res.status(404).render('404', { title: "Competition or Announcement not found" });
      }

      // Find the announcement and remove the comment
      const announcement = competition.announcements[index];
      announcement.comments.splice(commentIndex, 1);

      // Save the updated competition
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
    
    // Get followers who are also followed by the current user and are not judges of the competition
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

    // Find the competition
    const competition = await Competition.findById(compId).populate('host');
    if (!competition) {
      res.status(404).render('404', { title: "Competition not found" });
    }

    // Check if the user is already a judge
    if (competition.judges.some(judge => judge.user.equals(userId))) {
      return res.status(400).json({ error: "User is already a judge" });
    }

    // Find the user being requested to be a judge
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).render('404', { title: "User not found" });
    }

    // Add the user as a judge with status "pending"
    competition.judges.push({ user: userId, judgeName: user.username, status: "pending" });
    await competition.save();

    // Create a notification for the user
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

    // Find the competition
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

    // Update the notification type to "accept judge"
    notification.type = "accept judge";

    // Save the modified user object
    await user.save();

    // console.log(competition.judges);

    // Create a notification for the competition host
    const notificationContent = `${user.username} has accepted to judge ${competition.title}`;
    competition.host.notifications.push({
      type: "accept judge",
      content: notificationContent
    });

    // Save the modified competition object
    await competition.host.save();

    // Update the status of the judge to "accepted"
    const judgeIndex = competition.judges.findIndex(judge => judge.user.toString() === user._id.toString());
    if (judgeIndex !== -1) {
      competition.judges[judgeIndex].status = "accepted";
    }

    // Save the modified competition object
    await competition.save();

    res.status(200).json({ message: "Judge request accepted successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// POST route handler to reject the judge request
const post_judgeReject = async (req, res) => {
  try {
    const compId = req.params.compId;
    const user = await User.findById(req.session.user._id);

    if (!user) {
      return res.status(404).render('404', { title: "User not found" });
    }

    // Find the competition
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

    // Update the notification type to "reject judge"
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
  post_createQuestion
};