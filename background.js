chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ['content.js']
    });
  });


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Check the action type
  if (request.action === 'SEND_ARRAY') {
    const receivedArray = request.payload;
    const val = receivedArray[0];
    console.log('Background: Array received from content script:', receivedArray);
    //sendResponse({ status: 'ok', message: 'Array processed successfully' });

// Prepare payload for POST
    const payload = {
      option: 'log',                   // or any other option you need
      hashDomain: receivedArray[0] || 'defaultDomain'
    };
    
    // Send POST request to Google Apps Script endpoint
    fetch('https://script.google.com/macros/s/AKfycbw2KEqWbfpnX4diQpN5NMH8jPYAZhcjC3mKyN-gnP3CqkhSg8gE-ljDAfao1xukF6dT/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(response => response.json())
      .then(data => {
        console.log('Background: Response from server:', data);
        sendResponse({ status: 'ok', data });
      })
      .catch(error => {
        console.error('Background: Error sending POST request:', error);
        sendResponse({ status: 'error', error: error.toString() });
      });

  }
  return true;
});

async function shortHash(message, length = 10) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.slice(0, length);
}