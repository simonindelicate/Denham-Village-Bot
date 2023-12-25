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
    // First, handle the specific case to avoid double processing.
    let specificCase = /www\.denhamhistory\.online/gim;
    let replacedText = inputText.replace(specificCase, 'SPECIALCASE');

    // Next, replace general URLs.
    // URLs starting with http://, https://, or ftp://
    replacedText = replacedText.replace(/(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim, '<a href="$1" target="_blank">$1</a>');

    // URLs starting with "www." (excluding the already handled specific case)
    replacedText = replacedText.replace(/(^|[^\/])(www\.[\S]+(\b|$))/gim, '$1<a href="http://$2" target="_blank">$2</a>');

    // Finally, revert the specific case back with proper replacement.
    replacedText = replacedText.replace(/SPECIALCASE/g, '<a href="http://www.denhamhistory.online" target="_blank">denhamhistory.online</a>');

    return replacedText;
}



