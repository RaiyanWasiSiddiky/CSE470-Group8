const {User, Admin, Applicant, Competition} = require('../models/schemas');
const timeutils = require('../timeutensils.js');


const get_index = (req, res)=>{
    res.render('index', {title: 'Welcome'});
};
  

const get_login = (req, res)=>{
    res.render('login', {title: 'Login'});
};
  

const get_signup = (req, res)=>{
    res.render('signup', {title: 'signup'});
};
  

const get_forgotpass = (req, res)=>{
    res.render('forgotpass', {title: 'Reset Password'});
};


const get_signout = (req, res) => {
    // Destroy the session to clear the user information
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            res.status(500).send('Error signing out');
        } else {
         
            res.redirect('/');
        }
    });
};


const post_login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });

        // If user is not found, try finding admin by email
        let authenticatedUser;
        if (!user) {
            // Find admin by email
            authenticatedUser = await Admin.findOne({ email });
        } else {
            authenticatedUser = user;
        }

        // Check if user/admin exists
        if (!authenticatedUser) {
            return res.status(400).json({ error: 'User or admin not found' });
        }

        // Compare passwords
        const isPasswordValid = (password === authenticatedUser.password);

        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Set user/admin information in session
        req.session.user = authenticatedUser;

        // If password matches, redirect to home page
        res.redirect('/competitions/home');

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

  
const post_signup = async (req, res) => {
    try {
        const { fullname, username, dob, email, password, confirmpassword, securityquestion, securityanswer } = req.body;

        // Check if the email is already registered
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email is already registered' });
        }

        // Check if passwords match
        if (password !== confirmpassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        // Create a new user instance
        const newUser = new User({
            fullname,
            username,
            email,
            password,
            dob,
            securityQuestion: {
                question: securityquestion,
                answer: securityanswer
            }
        });


        await newUser.save();

        res.redirect('/login');

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const post_resetPassword = async (req, res) => {
    try {
        const { email, securityquestion, securityanswer, firsttry, secondtry } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        // Check if the provided security question and answer match
        // console.log(user.securityQuestion.question);
        // console.log(user.securityQuestion.answer);
        // console.log(securityquestion);
        // console.log(securityanswer);
        if (user.securityQuestion.question !== securityquestion || user.securityQuestion.answer !== securityanswer) {
            return res.status(400).json({ error: 'Incorrect security question or answer' });
        }

        // Validate the passwords
        if (firsttry !== secondtry) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        // Update the user's password
        user.password = firsttry;
        await user.save();

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const get_profile = async (req, res) => {
    try {
        const user = req.session.user;

        const userID = req.params.userId;

        const profileuser = await User.findById(userID).populate('competitions');

        // console.log(profileuser);

        if (!profileuser) {
            return res.status(404).send('User not found');
        }

        res.render('profile', { profileuser, title:"Profile Page", user });
    } catch (error) {
        // Handle any errors and send a 500 Internal Server Error response
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};


const post_updateUserProfile = async (req, res) => {
    try {
        
        const userId = req.session.user._id; 
        

        const { fullname, username, email, dob } = req.body;

        await User.findByIdAndUpdate(userId, { fullname, username, email, dob });

        res.status(200).send('User profile updated successfully');
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).send('Internal Server Error');
    }
};


const post_follow = async (req, res) => {
    const { userID } = req.params;
    const currentUserID = req.session.user._id; 

    try {
        
        const currentUser = await User.findById(currentUserID);
        const userToFollow = await User.findById(userID);

        if (!currentUser || !userToFollow) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Add the user to follow to the current user's follows array
        currentUser.follows.push(userID);
        await currentUser.save();

        // Add the current user to the user to follow's followers array
        userToFollow.followers.push(currentUserID);

        // Create a notification for the user being followed
        const notification = {
            type: 'follow',
            content: `${currentUser.username} has followed you`,
            createdAt: Date.now() // Set the current date and time
        };
        userToFollow.notifications.push(notification);

        await userToFollow.save();

        // res.status(200).json({ message: 'User followed successfully' });
        // res.redirect(`/followers/${currentUserID}`);
        res.redirect('/login');

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const get_followers =  async (req, res) => {
    const user = req.session.user;
    const userId = req.params.userId;

    const user1 = await User.findById(userId)
      .populate("follows")
      .populate("followers");

    res.render('followers', { user, user1, title:`${user1.username}'s Followers` });
};


const post_unfollow = async (req, res) => {
    try {
        const userIdToUnfollow = req.params.userId;

        // Find the current user
        const currentUser = await User.findById(req.session.user._id);

        // Find the user to unfollow
        const userToUnfollow = await User.findById(userIdToUnfollow);

        if (!currentUser || !userToUnfollow) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Remove userToUnfollow from currentUser's follows array
        currentUser.follows = currentUser.follows.filter(userId => userId.toString() !== userIdToUnfollow);
        await currentUser.save();

        // Remove currentUser from userToUnfollow's followers array
        userToUnfollow.followers = userToUnfollow.followers.filter(userId => userId.toString() !== currentUser._id.toString());

        // Create a notification for the user being unfollowed
        const notification = {
            type: 'unfollow',
            content: `${currentUser.username} has unfollowed you`,
            createdAt: Date.now() // Set the current date and time
        };
        userToUnfollow.notifications.push(notification);

        await userToUnfollow.save();

        // res.redirect(`/followers/${req.session.user._id}`); 
        res.redirect('/login');

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const get_notifications = async (req, res) => {
    try {
        const userId = req.params.userId;
        // Find the user by ID in the database and populate the 'notifications.comp' field
        const user = await User.findById(userId).populate({
            path: 'notifications',
            populate: { path: 'comp' }
        });
        if (!user) {
    
            return res.status(404).send('User not found');
        }
        // Sort notifications by createdAt in descending order (latest first)
        user.notifications.sort((a, b) => b.createdAt - a.createdAt);
        // Render the notifications.ejs template with the user object and getTimeSince function
        res.render('notifications', { user, getTimeSince: timeutils.getTimeSince, title: `${user.username}'s notifications` });
    } catch (error) {
        // Handle any errors and send a 500 Internal Server Error response
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};


module.exports = {
    get_index,
    get_login,
    get_signup,
    get_forgotpass,
    get_signout, 
    post_signup,
    post_login,
    post_resetPassword,
    get_profile,
    post_updateUserProfile,
    post_follow,
    get_followers,
    post_unfollow,
    get_notifications
};