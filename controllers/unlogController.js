const {User, Admin, Applicant, Competition} = require('../models/schemas');

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
            // Redirect the user to the home page or login page after signing out
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
        // Extract user details from the request body
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

        // Save the new user to the database
        await newUser.save();

        // Redirect the user to the login page after successful signup
        res.redirect('/login');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const post_resetPassword = async (req, res) => {
    try {
        const { email, securityquestion, securityanswer, firsttry, secondtry } = req.body;

        // Find the user by email
        const user = await User.findOne({ email });

        // Check if the user exists
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        // Check if the provided security question and answer match
        console.log(user.securityQuestion.question);
        console.log(user.securityQuestion.answer);
        console.log(securityquestion);
        console.log(securityanswer);
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

        // Send a success response
        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// Controller function to fetch user data and render the profile page
const get_profile = async (req, res) => {
    try {
        const user = req.session.user;
        // Retrieve the user ID from request parameters
        const userID = req.params.userID;

        // Find the user by ID in the database
        const profileuser = await User.findById(userID); //.populate('friends'); // Adjust as needed based on your schema

        if (!profileuser) {
            // If user not found, send 404 Not Found response
            return res.status(404).send('User not found');
        }

        // Render the userProfile.ejs template with the user data
        res.render('profile', { profileuser, title:"Profile Page",  user });
    } catch (error) {
        // Handle any errors and send a 500 Internal Server Error response
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};


const post_updateUserProfile = async (req, res) => {
    try {
        // Retrieve user ID from session or request body, depending on your authentication method
        const userId = req.session.user._id; // Assuming the user object in the session contains the user ID
        
        // Retrieve updated information from request body
        const { fullname, username, email, dob } = req.body;

        // Update the user profile
        await User.findByIdAndUpdate(userId, { fullname, username, email, dob });

        // Send a success response
        res.status(200).send('User profile updated successfully');
    } catch (error) {
        console.error('Error updating user profile:', error);
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
    post_updateUserProfile
};