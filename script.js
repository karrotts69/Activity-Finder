const geoApiKey = 'fe33969dcdad4a51871bca019bfdc17b'; // Geoapify API
const ticketMasterKey = 'bbvKoLxRUyQWAFuQeCwzpBAPvAMV1DR5'; // Ticketmaster API
const eventfulKey = 'YOUR_EVENTFUL_API_KEY'; // Eventful API
const meetupKey = 'YOUR_MEETUP_API_KEY'; // Meetup API

async function fetchNearbyTowns(location) {
    try {
        const geoResponse = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${location}&apiKey=${geoApiKey}`);
        
        // Check if the response is OK
        if (!geoResponse.ok) {
            throw new Error(`Error: ${geoResponse.statusText}`);
        }
        
        const geoData = await geoResponse.json();
        console.log('Geoapify Response:', geoData); // Log the entire response for debugging

        if (geoData.results && geoData.results.length > 0) {
            return geoData.results; // Return results
        } else {
            alert('No towns found for this location.');
            return []; // Return empty array if no results found
        }
    } catch (error) {
        console.error('Error fetching nearby towns:', error);
        alert('Failed to fetch nearby towns. Please try again.');
        return []; // Return an empty array on error
    }
}

async function fetchActivities(location, startDate, endDate, budget) {
    try {
        const towns = await fetchNearbyTowns(location);
        console.log('Nearby Towns:', towns); // Debug output

        // Check if towns are retrieved correctly
        if (!towns || towns.length === 0) {
            return; // Exit if no towns are found
        }

        const { display_name, lat, lon } = towns[0]; // Get the first town's display name and coordinates
        console.log(`Searching events in: ${display_name}`);

        // Fetch events from Ticketmaster
        const eventsData = await fetchTicketmasterEvents(lat, lon, startDate, endDate, budget);
        if (!eventsData._embedded || !eventsData._embedded.events) {
            alert('No events found for this location and date range');
            return;
        }

        const filteredEvents = eventsData._embedded.events.filter(event => {
            return event.priceRanges && event.priceRanges.length > 0 && event.priceRanges[0].min <= budget;
        });

        if (filteredEvents.length > 0) {
            displayResults(filteredEvents);
        } else {
            alert('No paid events found within your budget');
        }

        // Fetch activities from Eventful, added for additional sources of events
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
