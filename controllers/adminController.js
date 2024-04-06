const {User, Admin, Competition} = require('../models/schemas');

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
    delete_user
  };