const {User, Admin, Competition} = require('../models/schemas');

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
          res.status(500).send('Internal Server Error');
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
          res.status(500).send('Internal Server Error');
      });
  }
};

const get_comp = (req, res)=>{
  const user = req.session.user;
  const id = req.params.id;
  Competition.findById(id)
    .then((result) => {
      res.render('competitions/compDets', { comp: result, title: result.title, user:user});
    })
    .catch((err)=>{
      res.status(404).render('404', {title: "Competition not found"});
    });
};


const get_createcomp = function(req, res){
  const user = req.session.user;
  res.render('competitions/createcomp', { title:"Create", user:user });
};


const post_createcomp = async (req, res) => {
  try {
      // Extract competition details from the request body
      const user = req.session.user;
      const { title, genre, about } = req.body;

      // Create a new competition instance
      const newCompetition = new Competition({
          title,
          genre,
          about,
          host: user._id,
          // Add the creator's user ID as a default judge
          judges: [user._id], // Assuming user ID is available in req.user
      });

      // Save the new competition to the database
      await newCompetition.save();

      // Redirect to the home page or display a success message
      res.redirect('/competitions/home');
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
        return res.status(404).json({ error: 'Competition not found' });
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
        return res.status(404).json({ error: 'Competition not found' });
    }

    // Create a new announcement object
    const newAnnouncement = {
        content: textContent,
        createdBy: user._id,
        createdAt: new Date()
    };

    // Push the new announcement to the announcements array
    competition.announcements.push(newAnnouncement);

    // Save the updated competition document
    await competition.save();

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
        return res.status(404).json({ error: 'Competition not found' });
    }

    // Ensure the announcementIndex is a valid number
    if (isNaN(announcementIndex) || announcementIndex < 0 || announcementIndex >= competition.announcements.length) {
        return res.status(400).json({ error: 'Invalid announcement index' });
    }

    // Get the specific announcement using the index
    const announcement = competition.announcements[announcementIndex];

    // Render the announcement_details view with the announcement data
    res.render('competitions/announcementDets', { comp: competition, title: competition.title, announcement, announcementIndex, user:user });

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
        return res.status(404).json({ error: 'Competition not found' });
    }

    // Ensure the announcementIndex is within the valid range
    if (announcementIndex < 0 || announcementIndex >= competition.announcements.length) {
        return res.status(400).json({ error: 'Invalid announcement index' });
    }

    // Create a new comment object
    const newComment = {
        content: comment_content,
        author: user._id,
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

const delete_announcement = async (req, res) => {
  try {
    const compId = req.params.id;
    const announcementIndex = req.params.index;

    // Find the competition by ID
    const competition = await Competition.findById(compId);
    if (!competition) {
        return res.status(404).json({ error: 'Competition not found' });
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



const delete_comp = (req, res)=>{
  const id = req.params.id;

  Competition.findByIdAndDelete(id)
    .then(result=>{
      res.json({ redirect: '/competitions/home'});
    })
    .catch(err=>{
      console.log(err);
    });
};

module.exports = {
  get_home,
  get_comp,
  get_createcomp,
  post_createcomp,
  delete_comp,
  post_announcement,
  delete_announcement,
  get_announcement,
  post_comment,
  get_createQuestion
};