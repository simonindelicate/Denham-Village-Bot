document.getElementById('submit-button').addEventListener('click', submitQuery);

document.getElementById('query-input').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        submitQuery();
    }
});

function submitQuery() {
    const responseArea = document.getElementById('response-area');
    // Clear existing response and show loading animation
    responseArea.innerHTML = '<div class="loading-dots"><div></div><div></div><div></div></div>';

    const query = document.getElementById('query-input').value;
    fetch('/.netlify/functions/chatbot', {
        method: 'POST',
        body: JSON.stringify({ query }),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Convert URLs to clickable links in the response
        const linkedResponse = linkify(data.answer);
        responseArea.innerHTML = linkedResponse; // Replace loading animation with response
    })
    .catch(error => {
        console.error('Error:', error);
        responseArea.innerText = 'Error fetching response';
    });
}

function linkify(inputText) {
    // First, replace the specific case for 'denhamhistory.online'
    // and mark it to prevent further processing.
    let replacedText = inputText.replace(/www\.denhamhistory\.online/gim, '<a href="http://www.denhamhistory.online" target="_blank">denhamhistory.online</a><!--denham-->');
    
    // Next, replace URLs starting with http://, https://, or ftp://
    replacedText = replacedText.replace(/(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim, '<a href="$1" target="_blank">$1</a>');

    // Then, replace URLs starting with "www." that haven't been marked.
    replacedText = replacedText.replace(/(^|[^\/])(www\.[\S]+(\b|$))/gim, (match) => {
        if (match.includes('<!--denham-->')) {
            // If the URL is marked, return it unaltered.
            return match.replace('<!--denham-->', '');
        } else {
            // If it's a general case, replace it.
            let urlPart = match.includes('www.') ? match.split('www.')[1] : match;
            return `<a href="http://www.${urlPart}" target="_blank">www.${urlPart}</a>`;
        }
    });

    return replacedText;
}



