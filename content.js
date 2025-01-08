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
  const fullSvgFilePath = chrome.runtime.getURL(svgFilePath);

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

      const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      titleElement.textContent = tooltipText;
      svgElement.insertBefore(titleElement, svgElement.firstChild);

      callback(svgElement);
    })
    .catch((error) => console.error('Error fetching SVG:', error));
}

// Creates a styled element with the provided svg path and value
function createStyledElementWithIcon(svgFilePath, iconClasses, title, value, suffix = '') {
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.color = '#898989';
  container.style.fontSize = '12px';
  container.style.marginBottom = '4px';

  createSvgElementFromFile(svgFilePath, iconClasses, title, (svgElement) => {
    container.insertBefore(svgElement, container.firstChild);
    svgElement.style.marginRight = '4px';
  });

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
  button.style.color = '#898989';
  button.style.fontSize = '12px';
  button.style.height = '16px';

  createSvgElementFromFile(svgFilePath, '', '', (svgElement) => {
    svgElement.style.marginRight = '4px';
    button.insertBefore(svgElement, button.firstChild);
  });

  const textNode = document.createTextNode(buttonText);
  button.appendChild(textNode);

  button.onclick = onClickCallback;

  return button;
}

// Updates the design card on the page with additional information
async function updateCardOnPage(design) {
  const selectedRegion = await getStoredRegion();
  const { points, rate, symbol } = getConversionRate(selectedRegion);

  const downloadPoints = calculatePoints(design.downloadCount, design.printCount);
  const printProfilePoints = calculatePrintProfileScore(design);
  const totalPoints = downloadPoints + printProfilePoints + design.boostInfo.total*12;
  const dollarValue = ((totalPoints / points) * rate).toFixed(2);
  const totalDownloads = design.downloadCount + design.printCount * 2;

  const linkSelector = `a[href="/${getCurrentLanguage()}/models/${design.id}"]`;
  const linkElement = document.querySelector(linkSelector);

  if (linkElement && !linkElement.hasAttribute('data-processed')) {
    const cardContainer = linkElement.parentElement;

    if (cardContainer) {
      linkElement.setAttribute('data-processed', 'true');

      const gridContainer = document.createElement('div');
      gridContainer.style.display = 'grid';
      gridContainer.style.gridTemplateColumns = '1fr 1fr';
      gridContainer.style.marginLeft = '12px';
      gridContainer.style.marginRight = '12px';
      gridContainer.style.gap = '8px';

      const defaultInstance = design.instances.find((instance) => instance.isDefault);
      const defaultInstanceId = defaultInstance ? defaultInstance.id : null;

      const openButton = createButtonElementWithIcon('icons/open.svg', 'Open', () => {
        if (defaultInstanceId) {
          const apiUrl = `${window.location.origin}/api/v1/design-service/instance/${defaultInstanceId}/f3mf?type=download`;
          fetch(apiUrl)
            .then((response) => response.json())
            .then((data) => {
              const openUrl = `bambustudio://open?file=${encodeURIComponent(data.url)}&name=${encodeURIComponent(
                data.name
              )}`;
              window.location.href = openUrl;
            })
            .catch((error) => {
              console.error('Error fetching instance details:', error);
            });
        } else {
          console.error('Default instance ID not found');
        }
      });
      openButton.style.gridArea = '1 / 1 / 2 / 2';
      gridContainer.appendChild(openButton);

      const downloadButton = createButtonElementWithIcon('icons/download.svg', 'Download', () => {
        if (defaultInstanceId) {
          const apiUrl = `${window.location.origin}/api/v1/design-service/instance/${defaultInstanceId}/f3mf?type=download`;
          fetch(apiUrl)
            .then((response) => response.json())
            .then((data) => {
              window.location.href = data.url;
            })
            .catch((error) => {
              console.error('Error fetching instance details:', error);
            });
        } else {
          console.error('Default instance ID not found');
        }
      });
      downloadButton.style.gridArea = '1 / 2 / 2 / 3';
      downloadButton.style.justifySelf = 'end';
      gridContainer.appendChild(downloadButton);

      const monetaryValueElement = createStyledElementWithIcon(
        'icons/money.svg',
        'fa-money-class',
        'Monetary Value',
        `${dollarValue}`
      );
      monetaryValueElement.style.justifySelf = 'start';
      gridContainer.appendChild(monetaryValueElement);

      if (design.hotScore && design.hotScore > 0) {
        const hotScoreElement = createStyledElementWithIcon(
          'icons/hot.svg',
          'fa-hot-class',
          'Hot Score',
          design.hotScore,
          'score'
        );
        hotScoreElement.style.justifySelf = 'end';
        gridContainer.appendChild(hotScoreElement);
      } else {
        const emptyDiv = document.createElement('div');
        gridContainer.appendChild(emptyDiv);
      }

      const downloadRewardsElement = createStyledElementWithIcon(
        'icons/download.svg',
        'fa-download-class',
        'Download Rewards',
        downloadPoints,
        'points'
      );
      downloadElement.style.justifySelf = 'start';

      const printProfileRewardsElement = createStyledElementWithIcon(
        'icons/print.svg',
        'fa-download-class',
        'Profile Rewards',
        printProfilePoints,
        'points'
      );
      printProfileRewardsElement.style.justifySelf = 'end';

      gridContainer.appendChild(downloadRewardsElement);
      gridContainer.appendChild(printProfileRewardsElement);

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

      cardContainer.appendChild(gridContainer);

      if (design.contest && design.contest.contestName) {
        const contestElement = createStyledElementWithIcon(
          'icons/contest.svg',
          'fa-contest-class',
          'Contest',
          design.contest.contestName
        );
        contestElement.style.gridColumn = '1 / -1';
        gridContainer.appendChild(contestElement);
      }
    }
  }
}

function updateProgressBar(progressBar, totalDownloads, downloadsRemaining) {
  let nextMilestone, milestoneGap, previousMilestone;

  if (totalDownloads <= 50) {
    nextMilestone = Math.ceil(totalDownloads / 10) * 10;
    previousMilestone = Math.floor(totalDownloads / 10) * 10;
    milestoneGap = 10;
  } else if (totalDownloads <= 500) {
    nextMilestone = Math.ceil((totalDownloads - 50) / 25) * 25 + 50;
    previousMilestone = Math.floor((totalDownloads - 50) / 25) * 25 + 50;
    milestoneGap = 25;
  } else if (totalDownloads <= 1000) {
    nextMilestone = Math.ceil((totalDownloads - 500) / 50) * 50 + 500;
    previousMilestone = Math.floor((totalDownloads - 500) / 50) * 50 + 500;
    milestoneGap = 50;
  } else {
    nextMilestone = Math.ceil((totalDownloads - 1000) / 100) * 100 + 1000;
    previousMilestone = Math.floor((totalDownloads - 1000) / 100) * 100 + 1000;
    milestoneGap = 100;
  }

  // Calculate progress percentage
  let progressPercentage;
  if (totalDownloads === previousMilestone) {
    progressPercentage = 0; // At the start of a new milestone
  } else {
    progressPercentage = ((totalDownloads - previousMilestone) / milestoneGap) * 100;
  }

  // Ensure the progress bar is never completely empty (for visual feedback)
  progressBar.style.width = `${Math.max(progressPercentage, 1)}%`;

  // Update the downloads remaining text
  if (downloadsRemaining) {
    const remaining = nextMilestone - totalDownloads;
    if (remaining === 0) {
      downloadsRemaining.textContent = 'Milestone reached!';
    } else {
      downloadsRemaining.textContent = `${remaining} more to go`;
    }
  }
}
let isFetchingMakerData = false;
let mergedData = [];

async function handleMakerPage(handle, lang) {
  try {
    if (isFetchingMakerData) {
      console.log('Already fetching maker data. Exiting to prevent duplicates.');
      return;
    }

    isFetchingMakerData = true;

    const makerData = await fetchAndExtractMakerData(handle, lang);
    mergedData = await fetchAndMergeLikes(handle, makerData, lang);

    mergedData.forEach(updateCardOnPage);

    setupMutationObserver();
  } catch (error) {
    console.error('Error handling maker page data:', error);
  } finally {
    isFetchingMakerData = false;
  }
}

async function getStoredRegion() {
  return new Promise((resolve) => {
    chrome.storage.local.get('selectedRegion', (data) => {
      const region = data.selectedRegion || 'Global';
      resolve(region);
    });
  });
}

function getConversionRate(region) {
  const rates = {
    US: { points: 490, rate: 40, symbol: '$' },
    EU: { points: 524, rate: 40, symbol: '€' },
    UK: { points: 535, rate: 35, symbol: '£' },
    CA: { points: 504, rate: 55, symbol: 'C$' },
    AU: { points: 511, rate: 65, symbol: 'A$' },
    JP: { points: 502, rate: 5300, symbol: '¥' },
    Global: { points: 490, rate: 40, symbol: '$' },
  };

  return rates[region] || rates['Global'];
}

function setupMutationObserver() {
  const observer = new MutationObserver((mutationsList, observer) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        const newDesigns = document.querySelectorAll('[data-trackid*="from_uploads"]:not([data-processed="true"])');
        newDesigns.forEach((designElement) => {
          designElement.setAttribute('data-processed', 'true');
          const trackId = designElement.getAttribute('data-trackid');
          const designId = trackId.split('_')[0];

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
  const container = document.querySelector('.user_adapt_padding');
  if (container) {
    observer.observe(container, config);
  } else {
    console.error('Could not find the container to observe.');
  }
}

async function fetchAndExtractMakerData(handle, lang) {
  const domain = window.location.origin;

  const initialResponse = await fetch(`${domain}/${lang}/@${handle}`);
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

  let offset = 0;
  const limit = 20;
  let allDesigns = [];
  let totalFetched = 0;
  let totalAvailable = 0;

  do {
    const designResponse = await fetch(
      `${domain}/api/v1/design-service/published/${userId}/design?handle=@${handle}&limit=${limit}&offset=${offset}&lang=${lang}`
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

async function fetchAndMergeLikes(handle, makerData, lang) {
  let offset = 0;
  let allLikesData = [];
  const domain = window.location.origin;

  while (true) {
    try {
      const response = await fetch(
        `${domain}/api/v1/design-service/my/design/like?handle=@${handle}&limit=20&offset=${offset}&lang=${lang}`
      );
      if (!response.ok) {
        throw new Error(`Error fetching likes data: ${response.status}`);
      }

      const likesData = await response.json();
      allLikesData = allLikesData.concat(likesData.hits);

      if (allLikesData.length >= likesData.total) {
        break;
      }

      offset += likesData.hits.length;
    } catch (error) {
      console.error('Error fetching or merging likes data:', error);
      return makerData;
    }
  }

  return mergeLikesIntoMakerData(makerData, allLikesData);
}

function mergeLikesIntoMakerData(makerData, likesData) {
  makerData.forEach((model) => {
    const likeEntry = likesData.find((like) => like.id === model.id);
    if (likeEntry) {
      model.hotScore = likeEntry.hotScore;
    }
  });

  return makerData;
}

function handleModelPage(modelId, lang) {
  const domain = window.location.origin;
  fetch(`${domain}/${lang}/models/${modelId}`)
    .then((response) => response.text())
    .then(async (htmlString) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
      const scriptTag = doc.getElementById('__NEXT_DATA__');
      if (!scriptTag) {
        throw new Error('Could not find the __NEXT_DATA__ script tag in the fetched page.');
      }
      const pageData = JSON.parse(scriptTag.textContent || '{}');
      const modelData = pageData.props?.pageProps?.design;
      if (modelData && modelData.id.toString() === modelId) {
        const downloadPoints = calculatePoints(modelData.downloadCount, modelData.printCount);
        const printProfilePoints = calculatePrintProfileScore(modelData);
        const totalPoints = downloadPoints + printProfilePoints + modelData.boostInfo.total*12;
        const selectedRegion = await getStoredRegion();
        const { points, rate, symbol } = getConversionRate(selectedRegion);

        const dollarValue = ((totalPoints / points) * rate).toFixed(2);

        const modelInfoContainer = document.querySelector('.model_info');
        if (modelInfoContainer) {
          const rewardsContainer = document.createElement('div');
          rewardsContainer.style.display = 'flex';
          rewardsContainer.style.justifyContent = 'space-between';
          rewardsContainer.style.alignItems = 'center';
          rewardsContainer.style.marginBottom = '8px';

          const downloadRewardsElement = createStyledElementWithIcon(
            'icons/download.svg',
            'fa-download-class',
            'Download Rewards',
            downloadPoints,
            'points'
          );
          const printProfileRewardsElement = createStyledElementWithIcon(
            'icons/print.svg',
            'fa-print-class',
            'Print Profile Rewards',
            printProfilePoints,
            'points'
          );
          const monetaryValueElement = createStyledElementWithIcon(
            'icons/money.svg',
            'fa-money-class',
            'Monetary Value',
            `${dollarValue}`
          );

          rewardsContainer.appendChild(downloadRewardsElement);
          rewardsContainer.appendChild(printProfileRewardsElement);
          rewardsContainer.appendChild(monetaryValueElement);

          modelInfoContainer.appendChild(rewardsContainer);

          if (modelData.contest && modelData.contest.contestName) {
            const contestElement = createStyledElementWithIcon(
              'icons/contest.svg',
              'fa-contest-class',
              'Contest',
              modelData.contest.contestName
            );
            modelInfoContainer.appendChild(contestElement);
          }

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

function getCurrentLanguage() {
  const pathParts = window.location.pathname.split('/');
  return pathParts[1] === 'en' || pathParts[1] === 'zh' ? pathParts[1] : 'en';
}

function checkPageTypeAndLoadData() {
  const makerMatch = window.location.href.match(
    /https:\/\/(www\.)?(makerworld\.com|makerworld\.com\.cn)\/(en|zh)\/@(\w+)/
  );
  const modelMatch = window.location.href.match(
    /https:\/\/(www\.)?(makerworld\.com|makerworld\.com\.cn)\/(en|zh)\/models\/(\d+)/
  );

  if (makerMatch) {
    const handle = makerMatch[4];
    const lang = makerMatch[3];
    handleMakerPage(handle, lang);
  } else if (modelMatch) {
    const modelId = modelMatch[4];
    const lang = modelMatch[3];
    handleModelPage(modelId, lang);
  }
}

checkPageTypeAndLoadData();

let lastPath = window.location.pathname + window.location.search;

setInterval(() => {
  const currentPath = window.location.pathname + window.location.search;

  if (currentPath !== lastPath) {
    lastPath = currentPath;
    checkPageTypeAndLoadData();
  }
}, 1000);
