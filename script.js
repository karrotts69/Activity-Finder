const geoApiKey = "fe33969dcdad4a51871bca019bfdc17b";
const ticketMasterKey = "bbvKoLxRUyQWAFuQeCwzpBAPvAMV1DR5";

async function fetchPlaceSuggestions(query) {
    const geoResponse = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${query}&apiKey=${geoApiKey}`);
    const geoData = await geoResponse.json();
    return geoData.features; // Return the found features
}

function createSuggestionList(suggestions) {
    const resultsList = document.getElementById('suggestions-list');
    resultsList.innerHTML = ""; // Clear previous suggestions

    suggestions.forEach(suggestion => {
        const li = document.createElement('li');
        li.textContent = suggestion.properties.formatted; // Show the formatted location
        li.className = 'suggestion-item';
        li.addEventListener('click', () => {
            document.getElementById('location').value = suggestion.properties.formatted; // Set the input value
            resultsList.innerHTML = ''; // Clear suggestions after selecting
        });
        resultsList.appendChild(li);
    });
}

async function handleLocationInput(event) {
    const query = event.target.value;
    if (query.length > 2) { // Fetch suggestions only if the query is more than 2 characters
        const suggestions = await fetchPlaceSuggestions(query);
        createSuggestionList(suggestions);
    }
}

// Add event listener to the input
document.getElementById('location').addEventListener('input', handleLocationInput);

// Search function remains the same
async function fetchActivities(location, startDate, endDate) {
    try {
        // Log the input values for debugging
        console.log(`Fetching activities for location: ${location}, from: ${startDate} to: ${endDate}`);

        // Get latitude and longitude using Geoapify
        const geoResponse = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${location}&apiKey=${geoApiKey}`);
        const geoData = await geoResponse.json();

        console.log('Geoapify response:', geoData); // Debugging line

        if (!geoData.results || geoData.results.length === 0) {
            alert('Location not found');
            return;
        }

        const { lat, lon } = geoData.results[0].geometry; // Extract coordinates

        // Fetch events from Ticketmaster
        const eventsResponse = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?latlong=${lat},${lon}&startDateTime=${startDate}T00:00:00Z&endDateTime=${endDate}T23:59:59Z&apikey=${ticketMasterKey}`);
        const eventsData = await eventsResponse.json();

        console.log('Ticketmaster response:', eventsData); // Debugging line

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
    
    // Validate inputs
    if (!location || !startDate || !endDate) {
        alert('Please fill in all fields');
        return;
    }
    
    fetchActivities(location, startDate, endDate);
});
