const {User, Admin, Applicant, Competition} = require('../models/schemas');
const timeutils = require('../timeutensils.js');

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
    .then((result) => {
      // Sort announcements in descending order based on createdAt field
      result.announcements.sort((a, b) => b.createdAt - a.createdAt);
      res.render('competitions/compDets', { comp: result, getTimeSince: timeutils.getTimeSince, title: result.title, user: user });
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

    newCompetition.judges.push({ user: user._id, status: 'accepted' });

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
  post_endCompetition
};