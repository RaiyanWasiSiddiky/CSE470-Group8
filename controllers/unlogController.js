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
        const isPasswordValid = password === authenticatedUser.password;

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
            securityQuestions: [{
                question: securityquestion,
                answer: securityanswer
            }]
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
        const { email, security_question, security_answer, firsttry, secondtry } = req.body;

        // Find the user by email
        const user = await User.findOne({ email });

        // Check if the user exists
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        // Check if the provided security question and answer match
        if (user.securityQuestion !== security_question || user.securityAnswer !== security_answer) {
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


module.exports = {
    get_index,
    get_login,
    get_signup,
    get_forgotpass,
    get_signout, 
    post_signup,
    post_login,
    post_resetPassword
};