const {User, Admin, Applicant, Competition} = require('../models/schemas');

const get_adminUsers =  async (req, res) => {
    try {
      const user = req.session.user;
      const users = await User.find();

      res.render('admins/adminUsers', { title: "All Users", users: users, user });
      
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };


const get_authenticate = async (req, res) => {
  try {
      const user = req.session.user;
      const applicants = await Applicant.find();

      res.render('admins/authenticate', { title: "Applicants", applicants, user });

  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
  }
};


const post_acceptApplicant = async (req, res) => {
  try {
    const applicantID = req.body.applicantID;

    const applicant = await Applicant.findById(applicantID);
    const userId = applicant.user;

    // Update hostAuth
    await User.findByIdAndUpdate(userId, { hostAuth: true });

    // Delete applicant
    await Applicant.deleteOne({ _id: applicantID });

    // Create notification
    const notificationContent = 'Your request for host Authentication has been approved';
    await User.findByIdAndUpdate(userId, { $push: { notifications: { type: 'authentication', content: notificationContent, createdAt: new Date() } } });

    res.redirect(`/admins/authenticate`);
    // res.json({ redirect: `/admins/authenticate` })
 
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const post_rejectApplicant = async (req, res) => {
  try {
    const applicantID = req.body.applicantID;

    const applicant = await Applicant.findById(applicantID);
    const userId = applicant.user;

    // Delete applicant
    await Applicant.deleteOne({ _id: applicantID });

    // Create notification
    const notificationContent = 'Your request for host Authentication has been rejected';
    await User.findByIdAndUpdate(userId, { $push: { notifications: { type: 'authentication', content: notificationContent, createdAt: new Date() } } });

    // Testing JSON redirect vs regular redirect
    // res.json({ redirect: `/admins/authenticate` })
    res.redirect(`/admins/authenticate`);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const delete_user = async (req, res) => {
    const userId = req.params.id;

    try {
        // Delete
        await User.findByIdAndDelete(userId);
        
        res.redirect(`/admins/adminUsers`);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// same as above but added logic that all competitions hosted by user are also deleted
// not sure if this would be good idea so kept it commented for now

// const delete_user = async (req, res) => {
//   const userId = req.params.id;

//   try {
//       const user = await User.findById(userId).populate('competitions');
      
//       if (!user) {
//           return res.status(404).send('User not found');
//       }

//       // Delete competitions hosted by the user
//       for (const competition of user.competitions) {
//           if (competition.host.toString() === userId) {
//               await Competition.findByIdAndDelete(competition._id);
//           }
//       }

//       // Delete the user
//       await User.findByIdAndDelete(userId);
      
//       // Redirect to the all users page or any other appropriate page
//       res.redirect('/admins/adminUsers');
//   } catch (error) {
//       console.error(error);
//       res.status(500).send('Internal Server Error');
//   }
// };

module.exports = {
  get_adminUsers,
  delete_user,
  get_authenticate,
  post_acceptApplicant,
  post_rejectApplicant
};