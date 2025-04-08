const geoApiKey = "fe33969dcdad4a51871bca019bfdc17b";
const ticketMasterKey = "bbvKoLxRUyQWAFuQeCwzpBAPvAMV1DR5";

// Fetch small towns based on user input
async function fetchNearbyTowns(location) {
    const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?q=${location}&format=json`);
    const geoData = await geoResponse.json();
    return geoData;
}

async function fetchActivities(location, startDate, endDate, budget) {
    try {
        const towns = await fetchNearbyTowns(location);
        console.log('Nearby Towns:', towns); // Debug output

        // Select the first town's name and coordinates
        if (towns.length === 0) {
            alert('No towns found for this location');
            return;
        }

        const { display_name, lat, lon } = towns[0]; // Get display name and coordinates of the first town
        console.log(`Searching events in: ${display_name}`);

        // Fetch events from Ticketmaster
        const eventsResponse = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?latlong=${lat},${lon}&startDateTime=${startDate}T00:00:00Z&endDateTime=${endDate}T23:59:59Z&apikey=${ticketMasterKey}`);
        const eventsData = await eventsResponse.json();

        console.log('Ticketmaster response:', eventsData); // Debugging line

        if (!eventsData._embedded || eventsData._embedded.events.length === 0) {
            alert('No events found for this location and date range');
            return;
        }

        // Filter events based on budget
        const filteredEvents = eventsData._embedded.events.filter(event => {
            return (event.priceRanges && event.priceRanges.length > 0 && event.priceRanges[0].min <= budget);
        });

        if (filteredEvents.length === 0) {
            alert('No events found within your budget');
            return;
        }

        displayResults(filteredEvents);
    } catch (error) {
        console.error('Error fetching activities:', error);
    }
}

// Event listener for search button
document.getElementById('search-btn').addEventListener('click', () => {
    const location = document.getElementById('location').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const budget = parseFloat(document.getElementById('budget').value.trim()) || 0; // Get the budget value

    if (!location || !startDate || !endDate || budget < 0) {
        alert('Please fill in all fields with valid data');
        return;
    }

    fetchActivities(location, startDate, endDate, budget);
});
// Add this part below your existing code in script.js.

document.getElementById("start-date").addEventListener("change", function() {
    const startDateValue = this.value;
    const endDateInput = document.getElementById("end-date");

    // Set the minimum date of the end date to the selected start date
    if (startDateValue) {
        endDateInput.setAttribute("min", startDateValue);
    }
});

document.getElementById("end-date").addEventListener("change", function() {
    const startDateValue = document.getElementById("start-date").value;
    const endDateValue = this.value;

    // Check if end date is before start date
    if (endDateValue < startDateValue) {
        alert("The 'Till' date cannot be before the 'From' date.");
        this.value = ''; // Clear the end date input
    }
});
