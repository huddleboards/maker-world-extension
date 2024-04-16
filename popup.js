// popup.js
document.addEventListener('DOMContentLoaded', () => {
  loadRegion(); // Call loadRegion to set the selector to the stored value

  const selector = document.getElementById('regionSelector');
  selector.addEventListener('change', saveRegion); // Add event listener for 'change' event
});

function saveRegion() {
  const region = document.getElementById('regionSelector').value;
  localStorage.setItem('userRegion', region); // TODO change to chrome.storage.local.set
}

function loadRegion() {
  const savedRegion = localStorage.getItem('userRegion');
  if (savedRegion) {
    document.getElementById('regionSelector').value = savedRegion;
  }
}
