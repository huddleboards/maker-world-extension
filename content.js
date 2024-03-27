function getHandleFromURL() {
  const url = window.location.href;
  const match = url.match(/@(\w+)/);
  return match ? match[1] : null;
}

function calculatePoints(downloadCount, printCount) {
  const totalDownloads = downloadCount + printCount * 2;
  const milestones = [10, 20, 30, 40, 50];
  let points = milestones.reduce((acc, milestone) => {
    return totalDownloads >= milestone ? acc + 30 : acc;
  }, 0);

  if (totalDownloads > 50) {
    points += 25 * Math.floor((totalDownloads - 50) / 25);
  }

  return points;
}

// Styling helper function (using Option 1 with <span> for clarity)
function createStyledElement(title, value) {
  const element = document.createElement('p');
  const titleSpan = document.createElement('span');
  titleSpan.textContent = `${title}: `;
  titleSpan.style.fontWeight = 'bold';
  element.appendChild(titleSpan);
  element.append(value);
  element.style.fontSize = '14px';
  return element;
}

function updateCardOnPage(design) {
  const points = calculatePoints(design.downloadCount, design.printCount);
  const pointsToDollarsConversionRate = 40 / 490;
  const dollarValue = (points * pointsToDollarsConversionRate).toFixed(2);

  // Select the link element that contains the design ID in its href
  const linkSelector = `a[href="/en/models/${design.id}"]`;
  const linkElement = document.querySelector(linkSelector);

  if (linkElement && !linkElement.hasAttribute('data-processed')) {
    // Find the parent container of the existing information
    const cardContainer = linkElement.parentElement;

    if (cardContainer) {
      // Mark the element as processed to avoid duplicate processing
      linkElement.setAttribute('data-processed', 'true');
      // Create and append styled elements
      if (design.hotScore !== undefined) {
        cardContainer.appendChild(createStyledElement('Hot Score', design.hotScore));
      }
      cardContainer.appendChild(createStyledElement('Reward Points', points));
      cardContainer.appendChild(createStyledElement('Value Towards Gift Card', `$${dollarValue}`));
      cardContainer.appendChild(
        createStyledElement(
          'Contest',
          design.contest && design.contest.contestName ? design.contest.contestName : 'N/A'
        )
      );
    }
  }
}

function injectUpdatedCards(data, handle) {
  // Notice 'handle' is now a parameter
  data.hits.filter((hit) => hit.designCreator.handle === handle).forEach(updateCardOnPage);
}

let isFetchingMakerData = false;
let mergedData = [];

async function handleMakerPage(handle) {
  try {
    if (isFetchingMakerData) {
      console.log('Already fetching maker data. Exiting to prevent duplicates.');
      return;
    }

    isFetchingMakerData = true;

    const makerData = await fetchAndExtractMakerData(handle);
    mergedData = await fetchAndMergeLikes(handle, makerData);

    // console.log('merged data', mergedData);

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

  // console.log('All designs fetched:', allDesigns);
  return allDesigns;
}

// Fetches likes data in batches
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

function handleModelPage(modelId) {
  console.log('handleModelPage', modelId);
  fetch(`https://makerworld.com/en/models/${modelId}`)
    .then((response) => response.text())
    .then((htmlString) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
      const scriptTag = doc.getElementById('__NEXT_DATA__');

      if (!scriptTag) {
        throw new Error('Could not find the __NEXT_DATA__ script tag in the fetched page.');
      }

      const pageData = JSON.parse(scriptTag.textContent || '{}');
      const modelData = pageData.props?.pageProps?.design; // Replace with the correct path to your data

      if (modelData && modelData.id.toString() === modelId) {
        const points = calculatePoints(modelData.downloadCount, modelData.printCount);
        const pointsToDollarsConversionRate = 40 / 490;
        const dollarValue = (points * pointsToDollarsConversionRate).toFixed(2);

        // You would select a container element on your model specific page to append this info
        // This should be the element where you want to show the download points and estimated gift card value
        const modelInfoContainer = document.querySelector('.model_info'); // Replace with the correct selector for your page

        if (modelInfoContainer) {
          modelInfoContainer.appendChild(createStyledElement('Reward Points', points));
          modelInfoContainer.appendChild(createStyledElement('Value Towards Gift Card', `$${dollarValue}`));
          modelInfoContainer.appendChild(
            createStyledElement(
              'Contest',
              modelData.contest && modelData.contest.contestName ? modelData.contest.contestName : 'N/A'
            )
          );
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

// Call this function when the script is first loaded
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
