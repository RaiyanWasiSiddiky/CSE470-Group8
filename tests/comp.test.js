const {User, Admin, Applicant, Competition} = require('../models/schemas');
const compController = require('../controllers/compController')
const timeutils = require('../timeutensils.js');

// GET APPLYHOST
// Mock the request and response objects
const mockReq = {
    session: {
      user: 'mockUser' // Mocking the user object in the session
    }
  };
  const mockRes = {
    render: jest.fn() // Mocking the render function of the response object
  };
  
  // Test case
  test('renders applyhost view with correct parameters', () => {
    // Call the function with mock request and response objects
    compController.get_applyhost(mockReq, mockRes);
  
    // Verify that the render function was called with the expected parameters
    expect(mockRes.render).toHaveBeenCalledWith('competitions/applyhost', {
      title: 'Apply for Host',
      user: 'mockUser' // Assert that the user object from the session is passed to the view
    });
  });

