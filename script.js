// Global variables
let map;
let markers = [];
let autocompleteTimeout;

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Event listeners for search functionality
    document.getElementById('searchBtn').addEventListener('click', searchActivities);
    document.getElementById('cityInput').addEventListener('input', handleCityInput);
    
    // Date validation - prevent end date from being before start date
    setupDateValidation();
    
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

// Set up date validation
function setupDateValidation() {
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    startDateInput.addEventListener('change', function() {
        // If end date is before start date, reset it
        if (endDateInput.value && new Date(endDateInput.value) < new Date(startDateInput.value)) {
            endDateInput.value = startDateInput.value;
        }
        // Set minimum date for end date
        endDateInput.min = startDateInput.value;
    });
    
    // Set today as minimum date for start date
    const today = new Date().toISOString().split('T')[0];
    startDateInput.min = today;
    
    // If no date is set yet, set end date min to today
    endDateInput.min = today;
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
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const budget = document.getElementById('budget').value;
    
    if (!cityInput) {
        alert('Please enter a city name');
        return;
    }
    
    // Validate dates if both are filled
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
        alert('End date cannot be before start date');
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
                findActivities(location.lat, location.lon, activityType, { startDate, endDate, budget });
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
function findActivities(lat, lon, activityType, filters = {}) {
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
        displayResults(data.elements, activityType, filters);
    })
    .catch(error => {
        console.error('Error fetching activities:', error);
        document.getElementById('resultsContainer').innerHTML = 
            '<p class="error">Error finding activities. Please try again later.</p>';
    });
}

// Get appropriate image for activity type
function getActivityImage(place, activityType) {
    // Default images based on activity type
    const defaultImages = {
        'parks': '/api/placeholder/400/300?text=Park',
        'hiking': '/api/placeholder/400/300?text=Hiking+Trail',
        'recreation': '/api/placeholder/400/300?text=Recreation+Area'
    };
    
    // Try to get a more specific image based on tags
    if (place.tags) {
        if (place.tags.leisure === 'playground') {
            return '/api/placeholder/400/300?text=Playground';
        }
        if (place.tags.leisure === 'sports_centre') {
            return '/api/placeholder/400/300?text=Sports+Center';
        }
        if (place.tags.sport) {
            return `/api/placeholder/400/300?text=${place.tags.sport.charAt(0).toUpperCase() + place.tags.sport.slice(1)}`;
        }
    }
    
    // Return default image for the activity type
    return defaultImages[activityType] || '/api/placeholder/400/300?text=Activity';
}

// Display the search results on the map and in the results container
function displayResults(places, activityType, filters = {}) {
    const resultsContainer = document.getElementById('resultsContainer');
    
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    if (places.length === 0) {
        resultsContainer.innerHTML = `<p>No ${activityType} found in this area. Try expanding your search or choosing a different activity type.</p>`;
        return;
    }
    
    // Apply filters if any
    let filteredPlaces = places;
    // Filter by budget if provided
    if (filters.budget) {
        // This is a placeholder - in a real app, you'd have actual budget data
        // For now, let's assume all activities are free unless they have a fee tag
        filteredPlaces = filteredPlaces.filter(place => {
            if (place.tags && place.tags.fee === 'yes') {
                // If there's an estimated cost and it's within budget, keep it
                if (place.tags.fee_amount) {
                    return parseFloat(place.tags.fee_amount) <= parseFloat(filters.budget);
                }
                return false; // Unknown cost, filter it out if budget is strict
            }
            return true; // No fee, so it's within any budget
        });
    }
    
    // Create header for results
    const resultsHeader = document.createElement('h2');
    resultsHeader.textContent = `${activityType.charAt(0).toUpperCase() + activityType.slice(1)} (${filteredPlaces.length} found)`;
    resultsContainer.appendChild(resultsHeader);
    
    if (filters.startDate || filters.endDate) {
        const dateRange = document.createElement('p');
        dateRange.className = 'date-range';
        dateRange.textContent = `${filters.startDate ? 'From: ' + filters.startDate : ''} ${filters.endDate ? 'Till: ' + filters.endDate : ''}`;
        resultsContainer.appendChild(dateRange);
    }
    
    // Create a list of results
    const resultsList = document.createElement('div');
    resultsList.className = 'results-grid';
    
    filteredPlaces.forEach((place, index) => {
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
        
        // Get appropriate image
        const imageSrc = getActivityImage(place, activityType);
        
        // Create result card
        const resultCard = document.createElement('div');
        resultCard.className = 'result-card';
        resultCard.dataset.index = index;
        resultCard.innerHTML = `
            <div class="result-image">
                <img src="${imageSrc}" alt="${name}" />
            </div>
            <div class="result-content">
                <h3>${name}</h3>
                ${getPlaceDetails(place)}
                <div class="result-footer">
                    ${place.tags && place.tags.fee === 'yes' ? 
                      `<span class="fee">Fee required</span>` : 
                      `<span class="free">Free</span>`}
                </div>
            </div>
        `;
        
        // Make the whole card clickable
        resultCard.addEventListener('click', () => {
            map.setView([lat, lon], 16);
            marker.openPopup();
        });
        
        resultsList.appendChild(resultCard);
    });
    
    resultsContainer.appendChild(resultsList);
}

// Extract useful details from a place
function getPlaceDetails(place) {
    const details = [];
    
    if (place.tags) {
        if (place.tags.description) details.push(`<p class="description">${place.tags.description}</p>`);
        
        const metaDetails = [];
        if (place.tags.website) metaDetails.push(`<a href="${place.tags.website}" target="_blank" class="website-link">Website</a>`);
        if (place.tags.opening_hours) metaDetails.push(`<span class="hours">Hours: ${place.tags.opening_hours}</span>`);
        if (place.tags.phone) metaDetails.push(`<span class="phone">Phone: ${place.tags.phone}</span>`);
        if (place.tags.surface) metaDetails.push(`<span class="surface">Surface: ${place.tags.surface}</span>`);
        if (place.tags.access) metaDetails.push(`<span class="access">Access: ${place.tags.access}</span>`);
        
        if (metaDetails.length > 0) {
            details.push(`<div class="meta-details">${metaDetails.join(' · ')}</div>`);
        }
    }
    
    return details.length > 0 ? details.join('') : '<p class="no-details">No additional details available</p>';
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
