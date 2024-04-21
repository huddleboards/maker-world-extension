// Returns the handle (username) from the current URL, or null if not found
function getHandleFromURL() {
  const url = window.location.href;
  const match = url.match(/@(\w+)/);
  return match ? match[1] : null;
}

// Calculates the reward points based on download and print counts
function calculatePoints(downloadCount, printCount) {
  const totalDownloads = downloadCount + printCount * 2;
  let points = 0;

  if (totalDownloads <= 50) {
    points += Math.floor(totalDownloads / 10) * 15;
  } else if (totalDownloads <= 500) {
    points += 5 * 15 + Math.floor((totalDownloads - 50) / 25) * 12;
  } else if (totalDownloads <= 1000) {
    points += 5 * 15 + 18 * 12 + Math.floor((totalDownloads - 500) / 50) * 20;
  } else {
    points += 5 * 15 + 18 * 12 + 10 * 20 + Math.floor((totalDownloads - 1000) / 100) * 30;
  }

  return points;
}

// Function to calculate and return the print profile score for the current user
function calculatePrintProfileScore(design) {
  let totalPoints = 0;

  design.instances.forEach((instance) => {
    const averageRating = instance.ratingScoreTotal / instance.ratingCount;

    if (instance.instanceCreator.uid === design.designCreator.uid && averageRating >= 4) {
      let instancePoints = 0;
      const downloadsEquivalent = instance.downloadCount + instance.printCount * 2;

      if (downloadsEquivalent <= 50) {
        instancePoints += Math.floor(downloadsEquivalent / 10) * 3;
      } else if (downloadsEquivalent <= 500) {
        instancePoints += 5 * 3 + Math.floor((downloadsEquivalent - 50) / 25) * 3;
      } else if (downloadsEquivalent <= 1000) {
        instancePoints += 5 * 3 + 18 * 3 + Math.floor((downloadsEquivalent - 500) / 50) * 5;
      } else {
        instancePoints += 5 * 3 + 18 * 3 + 10 * 5 + Math.floor((downloadsEquivalent - 1000) / 100) * 8;
      }

      totalPoints += instancePoints;
    }
  });

  return totalPoints;
}

// Function to create an SVG element from SVG content in a file
function createSvgElementFromFile(svgFilePath, iconClasses, tooltipText, callback) {
  // Get the full URL to the SVG file within the Chrome extension
  const fullSvgFilePath = chrome.runtime.getURL(svgFilePath);

  // Fetch the SVG content from the full file path
  fetch(fullSvgFilePath)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Network response was not ok, status: ${response.status}`);
      }
      return response.text();
    })
    .then((svgContent) => {
      const svgElement = new DOMParser().parseFromString(svgContent, 'image/svg+xml').documentElement;
      svgElement.setAttribute('class', iconClasses);
      svgElement.setAttribute('width', '16');
      svgElement.setAttribute('height', '16');

      // Add a tooltip using the 'title' element inside the SVG
      const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      titleElement.textContent = tooltipText; // Set the tooltip text
      svgElement.insertBefore(titleElement, svgElement.firstChild); // Add the title at the beginning of the SVG

      callback(svgElement); // Execute the callback function passing the SVG element
    })
    .catch((error) => console.error('Error fetching SVG:', error));
}

// Creates a styled element with the provided svg path and value
function createStyledElementWithIcon(svgFilePath, iconClasses, title, value, suffix = '') {
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.color = '#898989'; // Set text color
  container.style.fontSize = '12px';
  container.style.marginBottom = '4px';

  // Add the SVG icon with a tooltip to the container
  createSvgElementFromFile(svgFilePath, iconClasses, title, (svgElement) => {
    container.insertBefore(svgElement, container.firstChild); // Prepend SVG to the container
    svgElement.style.marginRight = '4px'; // Add space between icon and text
  });

  // Add the value to the container
  const valueSpan = document.createElement('span');
  valueSpan.textContent = `${value}${suffix ? ' ' + suffix : ''}`;
  container.appendChild(valueSpan);

  return container;
}

function createButtonElementWithIcon(svgFilePath, buttonText, onClickCallback) {
  const button = document.createElement('button');
  button.style.display = 'inline-flex';
  button.style.alignItems = 'center';
  button.style.border = 'none';
  button.style.background = 'none';
  button.style.padding = '0';
  button.style.paddingBottom = '4px';
  button.style.cursor = 'pointer';
  button.style.color = '#898989'; // Matching other text color
  button.style.fontSize = '12px';
  button.style.height = '16px'; // Adjust to match the height of other elements

  // Fetch the SVG icon
  createSvgElementFromFile(svgFilePath, '', '', (svgElement) => {
    svgElement.style.marginRight = '4px'; // Space between icon and text
    button.insertBefore(svgElement, button.firstChild); // Insert SVG before text
  });

  // Add the button text
  const textNode = document.createTextNode(buttonText);
  button.appendChild(textNode);

  // Set click callback
  button.onclick = onClickCallback;

  return button;
}

// Create and append styled elements
const hotSvgPath = 'icons/hot.svg';
const downloadSvgPath = 'icons/download.svg';
const printSvgPath = 'icons/print.svg';
const moneySvgPath = 'icons/money.svg';
const contestSvgPath = 'icons/contest.svg';

// Updates the design card on the page with additional information (Hot Score, Reward Points, Gift Card Value, and Contest Name)
async function updateCardOnPage(design) {
  const selectedRegion = await getStoredRegion(); // Get the region from local storage
  const { points, rate, symbol } = getConversionRate(selectedRegion);

  console.log('Selected Region:', selectedRegion, 'Points:', points, 'Rate:', rate, 'Symbol:', symbol); // Example: "Selected Region: US Points: 490 Rate: 40 Symbol: $

  const downloadPoints = calculatePoints(design.downloadCount, design.printCount);
  const printProfilePoints = calculatePrintProfileScore(design);
  const totalPoints = downloadPoints + printProfilePoints;
  const dollarValue = ((totalPoints / points) * rate).toFixed(2);
  const totalDownloads = design.downloadCount + design.printCount * 2;

  // Select the link element that contains the design ID in its href
  const linkSelector = `a[href="/en/models/${design.id}"]`;
  const linkElement = document.querySelector(linkSelector);

  if (linkElement && !linkElement.hasAttribute('data-processed')) {
    // Find the parent container of the existing information
    const cardContainer = linkElement.parentElement;

    if (cardContainer) {
      // Mark the element as processed to avoid duplicate processing
      linkElement.setAttribute('data-processed', 'true');

      // Create grid container with an additional row for buttons
      const gridContainer = document.createElement('div');
      gridContainer.style.display = 'grid';
      gridContainer.style.gridTemplateColumns = '1fr 1fr';
      gridContainer.style.marginLeft = '12px';
      gridContainer.style.marginRight = '12px';
      gridContainer.style.gap = '8px';

      // Find the default instance ID if available
      const defaultInstance = design.instances.find((instance) => instance.isDefault);
      const defaultInstanceId = defaultInstance ? defaultInstance.id : null;

      // Create and insert buttons directly into the grid, aligned as required
      const openButton = createButtonElementWithIcon('icons/open.svg', 'Open', () => {
        // Ensure there's a default instance ID to work with
        if (defaultInstanceId) {
          // Construct the API URL
          const apiUrl = `https://makerworld.com/api/v1/design-service/instance/${defaultInstanceId}/f3mf?type=download`;

          // Make the API request
          fetch(apiUrl)
            .then((response) => response.json())
            .then((data) => {
              // Construct the custom URL scheme using the response data
              const openUrl = `bambustudio://open?file=${encodeURIComponent(data.url)}&name=${encodeURIComponent(
                data.name
              )}`;

              // Open the custom URL scheme
              window.location.href = openUrl;
            })
            .catch((error) => {
              console.error('Error fetching instance details:', error);
            });
        } else {
          console.error('Default instance ID not found');
        }
      });
      openButton.style.gridArea = '1 / 1 / 2 / 2'; // Position the "Open" button
      gridContainer.appendChild(openButton);

      const downloadButton = createButtonElementWithIcon('icons/download.svg', 'Download', () => {
        // Ensure there's a default instance ID to work with
        if (defaultInstanceId) {
          // Construct the API URL
          const apiUrl = `https://makerworld.com/api/v1/design-service/instance/${defaultInstanceId}/f3mf?type=download`;

          // Make the API request
          fetch(apiUrl)
            .then((response) => response.json())
            .then((data) => {
              // Open the custom URL scheme
              window.location.href = data.url;
            })
            .catch((error) => {
              console.error('Error fetching instance details:', error);
            });
        } else {
          console.error('Default instance ID not found');
        }
      });
      downloadButton.style.gridArea = '1 / 2 / 2 / 3'; // Position the "Download" button
      downloadButton.style.justifySelf = 'end'; // Align the button to the end of the grid
      gridContainer.appendChild(downloadButton);

      // Monetary Value - insert after buttons
      const monetaryValueElement = createStyledElementWithIcon(
        moneySvgPath,
        'fa-money-class',
        'Monetary Value',
        `${dollarValue}`
      );
      monetaryValueElement.style.justifySelf = 'start';
      gridContainer.appendChild(monetaryValueElement);

      // Only add the Hot Score element if hotScore exists and is greater than zero
      if (design.hotScore && design.hotScore > 0) {
        const hotScoreElement = createStyledElementWithIcon(
          hotSvgPath,
          'fa-hot-class',
          'Hot Score',
          design.hotScore,
          'score'
        );
        hotScoreElement.style.justifySelf = 'end';
        gridContainer.appendChild(hotScoreElement);
      } else {
        // If no Hot Score, add an empty div to keep the grid layout
        const emptyDiv = document.createElement('div');
        gridContainer.appendChild(emptyDiv);
      }

      // Download Rewards - left-aligned
      const downloadRewardsElement = createStyledElementWithIcon(
        downloadSvgPath,
        'fa-download-class',
        'Download Rewards',
        downloadPoints,
        'points'
      );
      downloadRewardsElement.style.justifySelf = 'start';

      // Print Profile Rewards - right-aligned
      const printProfileRewardsElement = createStyledElementWithIcon(
        printSvgPath,
        'fa-download-class',
        'Profile Rewards',
        printProfilePoints,
        'points'
      );
      printProfileRewardsElement.style.justifySelf = 'end';

      // Add the second row elements
      gridContainer.appendChild(downloadRewardsElement);
      gridContainer.appendChild(printProfileRewardsElement);

      // Add the progress bar to display the next reward milestone
      const progressBarContainer = document.createElement('div');
      progressBarContainer.style.width = '100%';
      progressBarContainer.style.backgroundColor = '#e0e0e0';
      progressBarContainer.style.borderRadius = '8px';
      progressBarContainer.style.height = '10px';

      const progressBar = document.createElement('div');
      progressBar.style.height = '10px';
      progressBar.style.backgroundColor = '#4CAF50';
      progressBar.style.borderRadius = '8px';
      progressBar.style.width = '0%';

      progressBarContainer.appendChild(progressBar);

      const downloadsRemaining = document.createElement('span');
      downloadsRemaining.style.fontSize = '12px';
      downloadsRemaining.style.color = '#898989';
      downloadsRemaining.style.paddingLeft = '8px';

      updateProgressBar(progressBar, totalDownloads, downloadsRemaining);

      gridContainer.appendChild(progressBarContainer);
      gridContainer.appendChild(downloadsRemaining);

      // Add the grid container to the card container
      cardContainer.appendChild(gridContainer);

      // Check for contest and add to a new row if it exists
      if (design.contest && design.contest.contestName) {
        const contestElement = createStyledElementWithIcon(
          contestSvgPath,
          'fa-contest-class',
          'Contest',
          design.contest.contestName
        );
        contestElement.style.gridColumn = '1 / -1'; // Span across all columns
        gridContainer.appendChild(contestElement);
      }
    }
  }
}

function updateProgressBar(progressBar, totalDownloads, downloadsRemaining) {
  let nextMilestone, milestoneGap;
  if (totalDownloads <= 50) {
    nextMilestone = Math.ceil(totalDownloads / 10) * 10;
    milestoneGap = 10;
  } else if (totalDownloads <= 500) {
    nextMilestone = Math.ceil((totalDownloads - 50) / 25) * 25 + 50;
    milestoneGap = 25;
  } else if (totalDownloads <= 1000) {
    nextMilestone = Math.ceil((totalDownloads - 500) / 50) * 50 + 500;
    milestoneGap = 50;
  } else {
    nextMilestone = Math.ceil((totalDownloads - 1000) / 100) * 100 + 1000;
    milestoneGap = 100;
  }
  let progressPercentage = ((totalDownloads - (nextMilestone - milestoneGap)) / milestoneGap) * 100;
  progressBar.style.width = `${Math.min(progressPercentage, 100)}%`;
  if (downloadsRemaining) {
    downloadsRemaining.textContent = `${nextMilestone - totalDownloads} more to go`;
  }
}

// Injects the updated design cards into the page based on the provided data and handle
function injectUpdatedCards(data, handle) {
  // Notice 'handle' is now a parameter
  data.hits.filter((hit) => hit.designCreator.handle === handle).forEach(updateCardOnPage);
}

let isFetchingMakerData = false;
let mergedData = [];

// Handles the maker page by fetching and merging data, processing designs, and setting up a MutationObserver
async function handleMakerPage(handle) {
  try {
    if (isFetchingMakerData) {
      console.log('Already fetching maker data. Exiting to prevent duplicates.');
      return;
    }

    isFetchingMakerData = true;

    const makerData = await fetchAndExtractMakerData(handle);
    mergedData = await fetchAndMergeLikes(handle, makerData);

    // Process initial set of designs
    mergedData.forEach(updateCardOnPage);

    // Set up the MutationObserver to watch for new elements
    setupMutationObserver();
  } catch (error) {
    console.error('Error handling maker page data:', error);
  } finally {
    isFetchingMakerData = false;
  }
}

// Function to get the user's selected region from local storage
async function getStoredRegion() {
  return new Promise((resolve) => {
    chrome.storage.local.get('selectedRegion', (data) => {
      const region = data.selectedRegion || 'Global'; // Default to 'Global' if nothing is stored
      resolve(region);
    });
  });
}

/**
 * Retrieves the conversion rate for a given region.
 * This includes the number of points required for the base currency amount
 * and the currency symbol.
 *
 * @param {string} region The selected region by the user.
 * @returns {object} An object containing the points needed for the base amount, the base amount, and the currency symbol.
 */
function getConversionRate(region) {
  // Define conversion rates for each region
  const rates = {
    US: { points: 490, rate: 40, symbol: '$' },
    EU: { points: 524, rate: 40, symbol: '€' },
    UK: { points: 535, rate: 35, symbol: '£' },
    CA: { points: 504, rate: 55, symbol: 'C$' },
    AU: { points: 511, rate: 65, symbol: 'A$' },
    JP: { points: 502, rate: 5300, symbol: '¥' },
    Global: { points: 490, rate: 40, symbol: '$' }, // Assuming Global uses USD
  };

  // Return the rate for the specified region, or a default value if the region isn't specified
  return rates[region] || rates['Global'];
}

// Sets up a MutationObserver to watch for new design elements and process them accordingly
function setupMutationObserver() {
  const observer = new MutationObserver((mutationsList, observer) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        // Only select elements that have not been processed yet, based on the absence of the 'data-processed' attribute
        const newDesigns = document.querySelectorAll('[data-trackid*="from_uploads"]:not([data-processed="true"])');
        newDesigns.forEach((designElement) => {
          // Instead of adding a 'processed' class, set the 'data-processed' attribute to true
          designElement.setAttribute('data-processed', 'true');
          // Extract the design ID from the 'data-trackid' attribute
          const trackId = designElement.getAttribute('data-trackid');
          const designId = trackId.split('_')[0]; // Assuming the ID is the first part before '_'

          // Find the corresponding design data in 'mergedData'
          const designData = mergedData.find((d) => d.id === parseInt(designId, 10));
          if (designData) {
            updateCardOnPage(designData);
          } else {
            console.warn('Design data not found for ID:', designId);
          }
        });
      }
    }
  });

  const config = { childList: true, subtree: true };
  const container = document.querySelector('.user_adapt_padding'); // Ensure this selector targets the correct element
  if (container) {
    observer.observe(container, config);
  } else {
    console.error('Could not find the container to observe.');
  }
}

// Fetches data from the maker page and extracts desired maker info
async function fetchAndExtractMakerData(handle) {
  // Initial fetch to get the user's ID from the page data
  const initialResponse = await fetch(`https://makerworld.com/en/@${handle}`);
  if (!initialResponse.ok) {
    throw new Error(`Error fetching maker page data: ${initialResponse.status}`);
  }

  const htmlString = await initialResponse.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const scriptTag = doc.getElementById('__NEXT_DATA__');

  if (!scriptTag) {
    throw new Error('Could not find the __NEXT_DATA__ script tag in the fetched page.');
  }

  const pageData = JSON.parse(scriptTag.textContent || '{}');
  const userId = pageData.props?.pageProps?.userInfo?.uid;

  if (!userId) {
    throw new Error('User ID not found in page data.');
  }

  // Initialize variables for fetching all designs
  let offset = 0;
  const limit = 20; // Set the limit per request as needed
  let allDesigns = [];
  let totalFetched = 0;
  let totalAvailable = 0;

  do {
    // Fetch designs using the user's ID with offset and limit
    const designResponse = await fetch(
      `https://makerworld.com/api/v1/design-service/published/${userId}/design?handle=@${handle}&limit=${limit}&offset=${offset}`
    );
    if (!designResponse.ok) {
      throw new Error(`Error fetching designs: ${designResponse.status}`);
    }

    const designData = await designResponse.json();
    allDesigns = allDesigns.concat(designData.hits);
    totalAvailable = designData.total;
    totalFetched += designData.hits.length;
    offset += limit;
  } while (totalFetched < totalAvailable);

  return allDesigns;
}

// Fetches and merges likes data into the maker data
async function fetchAndMergeLikes(handle, makerData) {
  let offset = 0;
  let allLikesData = []; // Store all fetched likes

  while (true) {
    try {
      const response = await fetch(
        `https://makerworld.com/api/v1/design-service/my/design/like?handle=@${handle}&limit=20&offset=${offset}`
      );
      if (!response.ok) {
        throw new Error(`Error fetching likes data: ${response.status}`);
      }

      const likesData = await response.json();
      allLikesData = allLikesData.concat(likesData.hits); // Combine results

      if (allLikesData.length >= likesData.total) {
        break; // Stop fetching when all likes are received
      }

      offset += likesData.hits.length;
    } catch (error) {
      console.error('Error fetching or merging likes data:', error);
      return makerData; // Return original makerData if errors occur
    }
  }

  return mergeLikesIntoMakerData(makerData, allLikesData);
}

// Merges the collected likes into the original maker data
function mergeLikesIntoMakerData(makerData, likesData) {
  makerData.forEach((model) => {
    const likeEntry = likesData.find((like) => like.id === model.id);
    if (likeEntry) {
      model.hotScore = likeEntry.hotScore;
    }
  });

  return makerData;
}

// Handles the model page by fetching and displaying model-specific information (Reward Points, Gift Card Value)
// Handles the model page by fetching and displaying model-specific information (Reward Points, Gift Card Value, and Contest Name)
function handleModelPage(modelId) {
  fetch(`https://makerworld.com/en/models/${modelId}`)
    .then((response) => response.text())
    .then(async (htmlString) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
      const scriptTag = doc.getElementById('__NEXT_DATA__');
      if (!scriptTag) {
        throw new Error('Could not find the __NEXT_DATA__ script tag in the fetched page.');
      }
      const pageData = JSON.parse(scriptTag.textContent || '{}');
      const modelData = pageData.props?.pageProps?.design; // Replace with the correct path to your data
      if (modelData && modelData.id.toString() === modelId) {
        const downloadPoints = calculatePoints(modelData.downloadCount, modelData.printCount);
        const printProfilePoints = calculatePrintProfileScore(modelData);
        const totalPoints = downloadPoints + printProfilePoints;
        // Fetch the selected region and get the conversion rate
        const selectedRegion = await getStoredRegion(); // Fetch the user's selected region
        const { points, rate, symbol } = getConversionRate(selectedRegion);

        // Convert points to the dollar or local currency equivalent
        const dollarValue = ((totalPoints / points) * rate).toFixed(2);

        // You would select a container element on your model specific page to append this info
        // This should be the element where you want to show the download points and estimated gift card value
        const modelInfoContainer = document.querySelector('.model_info'); // Replace with the correct selector for your page
        if (modelInfoContainer) {
          // Create a container for the download, print, and monetary value
          const rewardsContainer = document.createElement('div');
          rewardsContainer.style.display = 'flex';
          rewardsContainer.style.justifyContent = 'space-between';
          rewardsContainer.style.alignItems = 'center';
          rewardsContainer.style.marginBottom = '8px';

          const downloadRewardsElement = createStyledElementWithIcon(
            downloadSvgPath,
            'fa-download-class',
            'Download Rewards',
            downloadPoints,
            'points'
          );
          const printProfileRewardsElement = createStyledElementWithIcon(
            printSvgPath,
            'fa-print-class',
            'Print Profile Rewards',
            printProfilePoints,
            'points'
          );
          // Monetary Value - insert after buttons
          const monetaryValueElement = createStyledElementWithIcon(
            moneySvgPath,
            'fa-money-class',
            'Monetary Value',
            `${dollarValue}`
          );

          rewardsContainer.appendChild(downloadRewardsElement);
          rewardsContainer.appendChild(printProfileRewardsElement);
          rewardsContainer.appendChild(monetaryValueElement);

          modelInfoContainer.appendChild(rewardsContainer);

          // Add contest information if available
          if (modelData.contest && modelData.contest.contestName) {
            const contestElement = createStyledElementWithIcon(
              contestSvgPath,
              'fa-contest-class',
              'Contest',
              modelData.contest.contestName
            );
            modelInfoContainer.appendChild(contestElement);
          }

          // Add the progress bar to display the next reward milestone
          const progressBarContainer = document.createElement('div');
          progressBarContainer.style.width = '100%';
          progressBarContainer.style.backgroundColor = '#e0e0e0';
          progressBarContainer.style.borderRadius = '8px';
          progressBarContainer.style.height = '10px';
          const progressBar = document.createElement('div');
          progressBar.style.height = '10px';
          progressBar.style.backgroundColor = '#4CAF50';
          progressBar.style.borderRadius = '8px';
          progressBar.style.width = '0%';
          progressBarContainer.appendChild(progressBar);
          const downloadsRemaining = document.createElement('span');
          downloadsRemaining.style.fontSize = '12px';
          downloadsRemaining.style.color = '#898989';
          downloadsRemaining.style.paddingLeft = '8px';
          const totalDownloads = modelData.downloadCount + modelData.printCount * 2;
          updateProgressBar(progressBar, totalDownloads, downloadsRemaining);
          modelInfoContainer.appendChild(progressBarContainer);
          modelInfoContainer.appendChild(downloadsRemaining);
        } else {
          console.error('Could not find the model info container on the page.');
        }
      } else {
        console.error('Model data not found or does not match the model ID.');
      }
    })
    .catch((error) => console.error('Error fetching model data:', error));
}

function checkPageTypeAndLoadData() {
  const makerMatch = window.location.href.match(/https:\/\/makerworld\.com\/en\/@(\w+)/);
  const modelMatch = window.location.href.match(/https:\/\/makerworld\.com\/en\/models\/(\d+)/);

  if (makerMatch) {
    // It's a maker page
    const handle = makerMatch[1];
    handleMakerPage(handle); // Call function to handle maker page
  } else if (modelMatch) {
    // It's a model page
    const modelId = modelMatch[1];
    handleModelPage(modelId); // Call function to handle model page
  }
}

// Checks the current page type (maker or model) and loads the appropriate data
checkPageTypeAndLoadData();

// Then setup your interval to check for URL changes
let lastPath = window.location.pathname + window.location.search; // Initial path without hash

setInterval(() => {
  const currentPath = window.location.pathname + window.location.search; // Current path without hash

  if (currentPath !== lastPath) {
    lastPath = currentPath; // Update lastPath to the new path
    checkPageTypeAndLoadData(); // This will handle the page based on the new URL
  }
}, 1000);
