let previousCounts = { commentCount: 0, designCount: 0 };
let checkInterval = null;

// Function to check notifications
async function checkNotifications() {
  try {
    const response = await fetch('https://makerworld.com/api/v1/user-service/my/message/count');
    if (!response.ok) return;

    const data = await response.json();
    const newComments = data.commentCount > previousCounts.commentCount;
    const newDesigns = data.designCount > previousCounts.designCount;

    if (newComments || newDesigns) {
      const totalNew = 
        (data.commentCount - previousCounts.commentCount) +
        (data.designCount - previousCounts.designCount);

      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'New MakerWorld Notifications',
        message: `You have ${totalNew} new notification${totalNew > 1 ? 's' : ''}!`
      });

      previousCounts = {
        commentCount: data.commentCount,
        designCount: data.designCount
      };
    }
  } catch (error) {
    console.error('Error checking notifications:', error);
  }
}

// Function to start notification checking
function startNotificationChecking(interval = 5) {
  stopNotificationChecking();
  checkInterval = setInterval(checkNotifications, interval * 60 * 1000);
  checkNotifications(); // Initial check
}

// Function to stop notification checking
function stopNotificationChecking() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateNotificationInterval') {
    startNotificationChecking(message.minutes);
  } else if (message.action === 'checkNotifications') {
    checkNotifications();
  }
});

// Load saved settings and start checking
chrome.storage.local.get(['notificationsEnabled', 'notificationFrequency']).then((data) => {
  const enabled = data.notificationsEnabled ?? true;
  const frequency = parseInt(data.notificationFrequency ?? '5');
  
  if (enabled) {
    startNotificationChecking(frequency);
  }
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.notificationsEnabled) {
      if (changes.notificationsEnabled.newValue) {
        chrome.storage.local.get('notificationFrequency').then((data) => {
          startNotificationChecking(parseInt(data.notificationFrequency ?? '5'));
        });
      } else {
        stopNotificationChecking();
      }
    }
  }
});
