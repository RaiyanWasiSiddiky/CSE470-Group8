// timeUtils.js

module.exports = {
    getTimeSince(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        let interval = Math.floor(seconds / 31536000);
        if (interval > 1) {
            return `${interval} years ago`;
        }
        interval = Math.floor(seconds / 2592000);
        if (interval > 1) {
            return `${interval} months ago`;
        }
        interval = Math.floor(seconds / 86400);
        if (interval > 1) {
            return `${interval} days ago`;
        }
        interval = Math.floor(seconds / 3600);
        if (interval > 1) {
            return `${interval} hours ago`;
        }
        interval = Math.floor(seconds / 60);
        if (interval > 1) {
            return `${interval} minutes ago`;
        }
        return `${Math.floor(seconds)} seconds ago`;
    },

    getTimeLeft(deadline) {
        const now = new Date();
        const deadlineDate = new Date(deadline);
        const timeLeft = deadlineDate - now;
    
        if (timeLeft <= 0) {
            return "Time Over";
        }
    
        const yearsLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24 * 365));
        const monthsLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
        const daysLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
        const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const secondsLeft = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
        let timeLeftString = '';
        if (yearsLeft > 0) {
            timeLeftString += `${yearsLeft} years `;
        }
        if (monthsLeft > 0) {
            timeLeftString += `${monthsLeft} months `;
        }
        if (daysLeft > 0) {
            timeLeftString += `${daysLeft} days `;
        }
        if (hoursLeft > 0) {
            timeLeftString += `${hoursLeft} hours `;
        }
        if (minutesLeft > 0) {
            timeLeftString += `${minutesLeft} minutes `;
        }
        if (secondsLeft > 0) {
            timeLeftString += `${secondsLeft} seconds `;
        }
    
        return timeLeftString.trim() + ' left';
    }
};