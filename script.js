const geoApiKey = 'fe33969dcdad4a51871bca019bfdc17b'; // Geoapify API
const ticketMasterKey = 'bbvKoLxRUyQWAFuQeCwzpBAPvAMV1DR5'; // Ticketmaster API
const eventfulKey = 'YOUR_EVENTFUL_API_KEY'; // Eventful API
const meetupKey = 'YOUR_MEETUP_API_KEY'; // Meetup API

// Function to fetch place suggestions (Auto-complete)
async function fetchPlaceSuggestions(query) {
    const geoResponse = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${query}&apiKey=${geoApiKey}`);
    const geoData = await geoResponse.json();
    return geoData.features; // Return the found features
}

// Create suggestion list for the location input
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

// Handle location input
async function handleLocationInput(event) {
    const query = event.target.value;
    if (query.length > 2) { // Fetch suggestions only if the query is more than 2 characters
        const suggestions = await fetchPlaceSuggestions(query);
        createSuggestionList(suggestions);
    }
}

// Fetch nearby towns using Geoapify
async function fetchNearbyTowns(location) {
    const geoResponse = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${location}&apiKey=${geoApiKey}`);
    const geoData = await geoResponse.json();
    return geoData.results;
}

// Fetch events from Ticketmaster
async function fetchTicketmasterEvents(lat, lon, startDate, endDate, budget) {
    const eventsResponse = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?latlong=${lat},${lon}&startDateTime=${startDate}T00:00:00Z&endDateTime=${endDate}T23:59:59Z&apikey=${ticketMasterKey}`);
    return await eventsResponse.json();
}

// Fetch activities from Eventful
async function fetchEventfulActivities(location, startDate, endDate) {
    const eventsResponse = await fetch(`http://api.eventful.com/json/events/search?location=${location}&date=${startDate},${endDate}&page_size=10&app_key=${eventfulKey}`);
    const eventsData = await eventsResponse.json();
    return eventsData.events; // Return the list of events
}

// Display results in the UI
function displayResults(events) {
    const resultsList = document.getElementById('results-list');
    resultsList.innerHTML = ""; // Clear previous results

    events.forEach(event => {
        const li = document.createElement('li');
        li.textContent = `${event.name || event.title} - ${event.start_time || event.date}`;
        if (event.venue) {
            li.textContent += ` at ${event.venue.name}`;
        }
        resultsList.appendChild(li);
    });
}

// Fetch activities based on location, date, and budget
async function fetchActivities(location, startDate, endDate, budget) {
    try {
        const towns = await fetchNearbyTowns(location);
        console.log('Nearby Towns:', towns); // Debug output

        if (towns.length === 0) {
            alert('No towns found for this location.');
            return;
        }

        const { display_name, lat, lon } = towns[0]; // Get display name and coordinates of the first town
        console.log(`Searching events in: ${display_name}`);

        // Ticketmaster events
        const eventsData = await fetchTicketmasterEvents(lat, lon, startDate, endDate, budget);
        if (!eventsData._embedded || !eventsData._embedded.events) {
            alert('No events found for this location and date range');
        } else {
            const filteredEvents = eventsData._embedded.events.filter(event => {
                return event.priceRanges && event.priceRanges.length > 0 && event.priceRanges[0].min <= budget;
            });

            if (filteredEvents.length > 0) {
                displayResults(filteredEvents);
            } else {
                alert('No paid events found within your budget');
            }
        }

        // Eventful activities
        const eventfulEvents = await fetchEventfulActivities(display_name, startDate, endDate);
        if (eventfulEvents && eventfulEvents.length > 0) {
            displayResults(eventfulEvents);
        } else {
            alert('No free events found from Eventful');
        }

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

    // Validate inputs
    if (!location || !startDate || !endDate || budget < 0) {
        alert('Please fill in all fields with valid data');
        return;
    }

    fetchActivities(location, startDate, endDate, budget);
});

// Event listener for location input for auto-complete functionality
document.getElementById('location').addEventListener('input', handleLocationInput);
