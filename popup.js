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

  const notificationsEnabled = document.getElementById('notifications-enabled');
  const notificationFrequency = document.getElementById('notification-frequency');

  // Load saved settings
  chrome.storage.local.get(['notificationsEnabled', 'notificationFrequency'], (data) => {
    notificationsEnabled.checked = data.notificationsEnabled ?? true;
    notificationFrequency.value = data.notificationFrequency ?? '5';
  });

  // Save settings when changed
  notificationsEnabled.addEventListener('change', () => {
    chrome.storage.local.set({ notificationsEnabled: notificationsEnabled.checked });
  });

  notificationFrequency.addEventListener('change', () => {
    chrome.storage.local.set({ notificationFrequency: notificationFrequency.value });
    // Update alarm interval
    chrome.runtime.sendMessage({ 
      action: 'updateNotificationInterval', 
      minutes: parseInt(notificationFrequency.value) 
    });
  });
});
