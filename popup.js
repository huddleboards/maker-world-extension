document.addEventListener('DOMContentLoaded', () => {
  const regionSelect = document.getElementById('region-select');

  // Retrieve the selected region from Chrome extension storage
  chrome.storage.local.get('selectedRegion', (data) => {
    if (data.selectedRegion) {
      regionSelect.value = data.selectedRegion;
    }
  });

  // Save the selected region to Chrome extension storage when changed
  regionSelect.addEventListener('change', () => {
    const selectedRegion = regionSelect.value;
    chrome.storage.local.set({ selectedRegion }, () => {
      // Reload the current page after saving the selected region
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.reload(tabs[0].id);
      });
    });
  });
});
