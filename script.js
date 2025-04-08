const locations = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose"];
const activities = ["Concerts", "Hiking", "Local Markets", "Walking Tracks", "Vineyards", "Museums", "Festivals", "Theater", "Workshops", "Outdoor Events"];

function autocomplete(input, array) {
    let currentFocus;
    
    input.addEventListener("input", function(e) {
        const value = this.value;
        closeAllLists();
        if (!value) return false;
        
        currentFocus = -1;

        const listDiv = document.createElement("div");
        listDiv.setAttribute("id", this.id + "autocomplete-list");
        listDiv.setAttribute("class", "autocomplete-items");
        this.parentNode.appendChild(listDiv);

        for (let item of array) {
            if (item.substr(0, value.length).toUpperCase() === value.toUpperCase()) {
                const itemDiv = document.createElement("div");
                itemDiv.innerHTML = "<strong>" + item.substr(0, value.length) + "</strong>";
                itemDiv.innerHTML += item.substr(value.length);
                itemDiv.innerHTML += "<input type='hidden' value='" + item + "'>";
                
                itemDiv.addEventListener("click", function(e) {
                    input.value = this.getElementsByTagName("input")[0].value;
                    closeAllLists();
                });
                listDiv.appendChild(itemDiv);
            }
        }
    });

    input.addEventListener("keydown", function(e) {
        const listDiv = document.getElementById(this.id + "autocomplete-list");
        if (listDiv) {
            const items = listDiv.getElementsByTagName("div");
            if (e.keyCode === 40) {
                currentFocus++;
                addActive(items);
            } else if (e.keyCode === 38) {
                currentFocus--;
                addActive(items);
            } else if (e.keyCode === 13) {
                e.preventDefault();
                if (currentFocus > -1) {
                    if (items) items[currentFocus].click();
                }
            }
        }
    });

    function addActive(items) {
        if (!items) return false;
        removeActive(items);
        if (currentFocus >= items.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = items.length - 1;
        items[currentFocus].classList.add("autocomplete-active");
    }

    function removeActive(items) {
        for (let item of items) {
            item.classList.remove("autocomplete-active");
        }
    }

    function closeAllLists(elmnt) {
        const items = document.getElementsByClassName("autocomplete-items");
        for (let item of items) {
            if (elmnt !== item && elmnt !== input) {
                item.parentNode.removeChild(item);
            }
        }
    }

    document.addEventListener("click", function(e) {
        closeAllLists(e.target);
    });
}

autocomplete(document.getElementById("location"), locations);
autocomplete(document.getElementById("activity"), activities);

// Fetch activities based on search
document.getElementById("search-btn").addEventListener("click", function() {
    const location = document.getElementById("location").value;
    const startDate = document.getElementById("start-date").value;
    const endDate = document.getElementById("end-date").value;
    const activity = document.getElementById("activity").value;
    
    // This is where you would execute a real API call, for now, we will just show the values
    const resultsList = document.getElementById("results-list");
    resultsList.innerHTML = `<li>Location: ${location}, Start Date: ${startDate}, End Date: ${endDate}, Activity: ${activity}</li>`;
});
