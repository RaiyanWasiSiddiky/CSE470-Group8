// Function to fetch competition information from the backend

// Function to display competition information
function displayCompetitionInfo(competition) {
    const competitionInfoContainer = document.getElementById('competition-info');
    competitionInfoContainer.innerHTML = `
        <h2>${competition.title}</h2>
        <p>Description: ${competition.description}</p>
        <p>Rules: ${competition.rules}</p>
        <!-- Add more information fields as needed -->
    `;
}

// Function to submit rating and review
function submitRatingAndReview() {
    const rating = document.getElementById('rating').value;
    const review = document.getElementById('review').value;
    // Here you would typically send the rating and review to the backend
    alert(`Rating: ${rating}, Review: ${review}`);
    // After submitting, you can redirect the user to another page or perform any other action
}

// Fetch competition information when the page loads
