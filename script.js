// Global variables
let map;
let markers = [];
let autocompleteTimeout;

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Event listeners for search functionality
    document.getElementById('searchBtn').addEventListener('click', searchActivities);
    document.getElementById('cityInput').addEventListener('input', handleCityInput);
    
    // Initialize map
    initMap();
    
    // Set up city input autocomplete container
    setupAutocomplete();
});

// Initialize the map with OpenStreetMap
function initMap() {
    map = L.map('map').setView([40.7128, -74.0060], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

// Set up autocomplete container
function setupAutocomplete() {
    const cityInput = document.getElementById('cityInput');
    const autocompleteContainer = document.createElement('div');
    autocompleteContainer.id = 'autocompleteContainer';
    autocompleteContainer.className = 'autocomplete-container';
    cityInput.parentNode.appendChild(autocompleteContainer);
}

// Handle input in the city field to trigger autocomplete
function handleCityInput(e) {
    const query = e.target.value.trim();
    const autocompleteContainer = document.getElementById('autocompleteContainer');
    
    // Clear any existing timeout
    if (autocompleteTimeout) {
        clearTimeout(autocompleteTimeout);
    }
    
    // Clear current autocomplete suggestions
    autocompleteContainer.innerHTML = '';
    
    // Only search if there are at least 3 characters
    if (query.length >= 3) {
        autocompleteTimeout = setTimeout(() => {
            fetchCitySuggestions(query);
        }, 300); // 300ms delay to prevent too many requests
    }
}

// Fetch city suggestions from OSM Nominatim API
function fetchCitySuggestions(query) {
    const apiUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&featuretype=city`;
    
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            displayCitySuggestions(data);
        })
        .catch(error => {
            console.error('Error fetching city suggestions:', error);
        });
}

// Display city suggestions in the autocomplete container
function displayCitySuggestions(suggestions) {
    const autocompleteContainer = document.getElementById('autocompleteContainer');
    autocompleteContainer.innerHTML = '';
    
    if (suggestions.length === 0) {
        autocompleteContainer.style.display = 'none';
        return;
    }
    
    suggestions.forEach(suggestion => {
        if (suggestion.type === "city" || suggestion.type === "town" || suggestion.type === "village" || suggestion.class === "place") {
            const cityName = suggestion.display_name.split(',')[0];
            const region = suggestion.address.state || suggestion.address.county || '';
            const country = suggestion.address.country || '';
            
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'autocomplete-item';
            suggestionItem.innerHTML = `<strong>${cityName}</strong>, ${region}, ${country}`;
            
            suggestionItem.addEventListener('click', () => {
                document.getElementById('cityInput').value = `${cityName}, ${region}, ${country}`;
                autocompleteContainer.innerHTML = '';
                autocompleteContainer.style.display = 'none';
                
                // Center map on selected location
                map.setView([suggestion.lat, suggestion.lon], 13);
            });
            
            autocompleteContainer.appendChild(suggestionItem);
        }
    });
    
    autocompleteContainer.style.display = 'block';
}

// Search for activities around the specified location
function searchActivities() {
    const cityInput = document.getElementById('cityInput').value;
    const activityType = document.getElementById('activityType').value;
    
    if (!cityInput) {
        alert('Please enter a city name');
        return;
    }
    
    // Clear existing markers
    clearMarkers();
    
    // First, geocode the city to get coordinates
    geocodeCity(cityInput)
        .then(location => {
            if (location) {
                // Center the map on the location
                map.setView([location.lat, location.lon], 13);
                
                // Find relevant activities based on type
                findActivities(location.lat, location.lon, activityType);
            } else {
                alert('City not found. Please try another location.');
            }
        })
        .catch(error => {
            console.error('Error during search:', error);
            alert('An error occurred during the search. Please try again.');
        });
}

// Geocode a city name to get coordinates using OSM Nominatim
function geocodeCity(cityName) {
    const apiUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`;
    
    return fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lon: parseFloat(data[0].lon)
                };
            }
            return null;
        });
}

// Find activities near a location based on activity type
function findActivities(lat, lon, activityType) {
    // Show loading indicator
    document.getElementById('resultsContainer').innerHTML = '<p class="loading">Searching for activities...</p>';
    
    // Construct the Overpass API query based on activity type
    let query;
    const radius = 5000; // 5km radius
    
    switch (activityType) {
        case 'parks':
            query = `
                [out:json];
                (
                    node["leisure"="park"](around:${radius},${lat},${lon});
                    way["leisure"="park"](around:${radius},${lat},${lon});
                    relation["leisure"="park"](around:${radius},${lat},${lon});
                );
                out center;
            `;
            break;
        case 'hiking':
            query = `
                [out:json];
                (
                    way["highway"="path"]["foot"="yes"](around:${radius},${lat},${lon});
                    way["highway"="footway"](around:${radius},${lat},${lon});
                    way["highway"="track"]["foot"="yes"](around:${radius},${lat},${lon});
                    relation["route"="hiking"](around:${radius},${lat},${lon});
                    relation["route"="foot"](around:${radius},${lat},${lon});
                );
                out center;
            `;
            break;
        case 'recreation':
            query = `
                [out:json];
                (
                    node["leisure"="recreation_ground"](around:${radius},${lat},${lon});
                    way["leisure"="recreation_ground"](around:${radius},${lat},${lon});
                    node["leisure"="playground"](around:${radius},${lat},${lon});
                    way["leisure"="playground"](around:${radius},${lat},${lon});
                    node["leisure"="sports_centre"](around:${radius},${lat},${lon});
                    way["leisure"="sports_centre"](around:${radius},${lat},${lon});
                );
                out center;
            `;
            break;
        default:
            query = `
                [out:json];
                (
                    node["leisure"](around:${radius},${lat},${lon});
                    way["leisure"](around:${radius},${lat},${lon});
                    relation["leisure"](around:${radius},${lat},${lon});
                );
                out center;
            `;
    }
    
    // Use Overpass API to find places
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    
    fetch(overpassUrl, {
        method: 'POST',
        body: query
    })
    .then(response => response.json())
    .then(data => {
        displayResults(data.elements, activityType);
    })
    .catch(error => {
        console.error('Error fetching activities:', error);
        document.getElementById('resultsContainer').innerHTML = 
            '<p class="error">Error finding activities. Please try again later.</p>';
    });
}

// Display the search results on the map and in the results container
function displayResults(places, activityType) {
    const resultsContainer = document.getElementById('resultsContainer');
    
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    if (places.length === 0) {
        resultsContainer.innerHTML = `<p>No ${activityType} found in this area. Try expanding your search or choosing a different activity type.</p>`;
        return;
    }
    
    // Create a list of results
    const resultsList = document.createElement('ul');
    resultsList.className = 'results-list';
    
    places.forEach((place, index) => {
        // Get coordinates - handle different types of OSM elements
        let lat, lon, name;
        
        if (place.type === 'node') {
            lat = place.lat;
            lon = place.lon;
        } else if (place.center) {
            lat = place.center.lat;
            lon = place.center.lon;
        } else {
            return; // Skip if no coordinates available
        }
        
        name = place.tags && place.tags.name ? place.tags.name : `${activityType.charAt(0).toUpperCase() + activityType.slice(1)} #${index + 1}`;
        
        // Create marker on the map
        const marker = L.marker([lat, lon]).addTo(map);
        marker.bindPopup(`<b>${name}</b><br>${getPlaceDetails(place)}`);
        markers.push(marker);
        
        // Add to results list
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <h3>${name}</h3>
            ${getPlaceDetails(place)}
            <button class="view-on-map" data-index="${index}">View on Map</button>
        `;
        resultsList.appendChild(listItem);
        
        // Add event listener to "View on Map" button
        listItem.querySelector('.view-on-map').addEventListener('click', () => {
            map.setView([lat, lon], 16);
            marker.openPopup();
        });
    });
    
    resultsContainer.appendChild(resultsList);
}

// Extract useful details from a place
function getPlaceDetails(place) {
    const details = [];
    
    if (place.tags) {
        if (place.tags.description) details.push(`Description: ${place.tags.description}`);
        if (place.tags.website) details.push(`Website: <a href="${place.tags.website}" target="_blank">${place.tags.website}</a>`);
        if (place.tags.opening_hours) details.push(`Hours: ${place.tags.opening_hours}`);
        if (place.tags.phone) details.push(`Phone: ${place.tags.phone}`);
        if (place.tags.surface) details.push(`Surface: ${place.tags.surface}`);
        if (place.tags.access) details.push(`Access: ${place.tags.access}`);
    }
    
    return details.length > 0 ? `<p>${details.join('<br>')}</p>` : '<p>No additional details available</p>';
}

// Clear all markers from the map
function clearMarkers() {
    markers.forEach(marker => {
        map.removeLayer(marker);
    });
    markers = [];
}

// Close the autocomplete when clicking outside of it
document.addEventListener('click', function(e) {
    const autocompleteContainer = document.getElementById('autocompleteContainer');
    const cityInput = document.getElementById('cityInput');
    
    if (e.target !== cityInput && e.target !== autocompleteContainer) {
        autocompleteContainer.innerHTML = '';
        autocompleteContainer.style.display = 'none';
    }
});
