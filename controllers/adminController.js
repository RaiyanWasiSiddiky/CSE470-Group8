const {User, Admin, Applicant, Competition} = require('../models/schemas');

const get_adminUsers =  async (req, res) => {
    try {
      const user = req.session.user;
      // Fetch all users from the database
      const users = await User.find();
  
      // Render a page to display the list of users
      res.render('admins/adminUsers', { title: "All Users", users: users, user });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  };


const get_authenticate = async (req, res) => {
  try {
      // Fetch all applications from the database
      const user = req.session.user;
      const applicants = await Applicant.find();

      // Render the applications page with the retrieved applications data
      res.render('admins/authenticate', { title: "Applicants", applicants, user });
  } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
  }
};


const post_acceptApplicant = async (req, res) => {
  try {
    const applicantID = req.body.applicantID;

    // Retrieve the user associated with the applicant
    const applicant = await Applicant.findById(applicantID);
    const userId = applicant.user;

    // Update the user's hostAuth property to true
    await User.findByIdAndUpdate(userId, { hostAuth: true });

    // Delete the applicant from the collection
    await Applicant.deleteOne({ _id: applicantID });

    // Create a notification for the user
    const notificationContent = 'Your request for host Authentication has been approved';
    await User.findByIdAndUpdate(userId, { $push: { notifications: { type: 'authentication', content: notificationContent, createdAt: new Date() } } });

    // Redirect back to the authenticate page after accepting
    res.redirect('/admins/authenticate');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};


const post_rejectApplicant = async (req, res) => {
  try {
    const applicantID = req.body.applicantID;

    // Retrieve the user associated with the applicant
    const applicant = await Applicant.findById(applicantID);
    const userId = applicant.user;

    // Delete the applicant from the collection
    await Applicant.deleteOne({ _id: applicantID });

    // Create a notification for the user
    const notificationContent = 'Your request for host Authentication has been rejected';
    await User.findByIdAndUpdate(userId, { $push: { notifications: { type: 'authentication', content: notificationContent, createdAt: new Date() } } });

    // Redirect back to the authenticate page after rejecting
    res.redirect('/admins/authenticate');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};


const delete_user = async (req, res) => {
    const userId = req.params.id;

    try {
        // Find the user by ID and delete it
        await User.findByIdAndDelete(userId);
        
        // Redirect to the all users page or any other appropriate page
        res.redirect('/admins/adminUsers');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};


module.exports = {
  get_adminUsers,
  delete_user,
  get_authenticate,
  post_acceptApplicant,
  post_rejectApplicant
};