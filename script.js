const geoApiKey = fe33969dcdad4a51871bca019bfdc17b;
const ticketMasterKey = bbvKoLxRUyQWAFuQeCwzpBAPvAMV1DR5;

async function fetchActivities(location, startDate, endDate) {
    try {
        // Get latitude and longitude using Geoapify
        const geoResponse = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${location}&apiKey=${geoApiKey}`);
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            alert('Location not found');
            return;
        }

        const { lat, lon } = geoData.results[0].geometry; // Extract coordinates

        // Fetch events from Ticketmaster
        const eventsResponse = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?latlong=${lat},${lon}&startDateTime=${startDate}T00:00:00Z&endDateTime=${endDate}T23:59:59Z&apikey=${ticketMasterKey}`);
        const eventsData = await eventsResponse.json();

        if (!eventsData._embedded || eventsData._embedded.events.length === 0) {
            alert('No events found for this location and date range');
            return;
        }

        displayResults(eventsData._embedded.events);
    } catch (error) {
        console.error('Error fetching activities:', error);
    }
}

// Function to display results
function displayResults(events) {
    const resultsList = document.getElementById('results-list');
    resultsList.innerHTML = ""; // Clear previous results

    events.forEach(event => {
        const li = document.createElement('li');
        li.textContent = `${event.name} - ${event.dates.start.localDate}`;
        resultsList.appendChild(li);
    });
}

// Event listeners
document.getElementById('search-btn').addEventListener('click', () => {
    const location = document.getElementById('location').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (!location || !startDate || !endDate) {
        alert('Please fill in all fields');
        return;
    }
    
    fetchActivities(location, startDate, endDate);
});
