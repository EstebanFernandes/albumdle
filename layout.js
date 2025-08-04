
// Global variable to store the parsed CSV data
let albumData = [];
let attempts = [];
let currentTranslations = {};
const maxAttempts = 6;
const attemptsBeforeCover = 3;
const attemptsBeforeTracks = 2;
//Autocomplete variables
let autoCompleteIndex = -1;

const regionNames = new Intl.DisplayNames(
  ['en'], { type: 'region' }
);

const input = document.getElementById('albumInput');
const suggestionBox = document.getElementById('autocompleteList');

let rankInfo = document.getElementById('rankInfo');
let releaseDateInfo = document.getElementById('releaseDateInfo');
let genreInfo = document.getElementById('genreInfo');
let typeInfo = document.getElementById('albumTypeInfo');
let groupMembersInfo = document.getElementById('groupMembersInfo');
let locationInfo = document.getElementById('locationInfo');
let labelInfo = document.getElementById('labelInfo');
//FULL DISPLAY
let artistName = document.getElementById('artistName');

//Game section needed


let attemptsLeftBeforeReveal = document.getElementById('attemptsLeft');
let attemptsRightBeforeReveal = document.getElementById('attemptsRight');

let albumHintCover = document.getElementById('albumHintCover');

let knownTracksList = document.getElementById('knownTracksList');


async function loadAlbumCSV() {
  try {
    const response = await fetch('albums.csv');
    const text = await response.text();
    albumData = parseCSV(text);
    //populateDatalist(albumData);
  } catch (err) {
    console.error("Failed to load CSV:", err);
  }
}

// Simple CSV parser for semicolon-separated values
function parseCSV(csvText) {

  const result = Papa.parse(csvText, {
    delimiter: ';', // Your CSV uses semicolons
    header: true, // First line as header row
    skipEmptyLines: true,
  });

  //console.log(result.data); // This is an array of objects parsed from CSV
  return result.data;
}

function getAlbumOfTheDay() {
  if (!albumData.length) return null;

  // Get the current date in UTC YYYY-MM-DD format
  const now = new Date();
  const daySeed = now.getUTCFullYear() + '-' +
    String(now.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(now.getUTCDate()).padStart(2, '0');

  let hash = 0;
  for (let i = 0; i < daySeed.length; i++) {
    hash = (hash << 5) - hash + daySeed.charCodeAt(i);
    hash |= 0;
  }

  const index = Math.abs(hash) % albumData.length;
  return albumData[index];
}


function createAlbumAttempt(data, todayAlbum) {
  const template = document.getElementById('albumAttemptTemplate');
  const clone = template.content.cloneNode(true);

  clone.querySelector('.album-title').textContent = data.album || 'Unknown Album';
  clone.querySelector('.album-artist').textContent = data.clean_name || 'Unknown Artist';
  clone.querySelector('.cover-image').src = data.large_thumbnails || 'fallback.jpg';

  //RANK LOGIC
  clone.querySelector('.rankIcon').textContent = data.rank_2020 || 'Unknown Rank';
  //If there is a difference consider as close or high, we apply a different color
  const rankDifference = todayAlbum ? Math.abs(todayAlbum.rank_2020 - data.rank_2020) : null;

  if(rankDifference !== null && rankDifference === 0 )
    clone.querySelector('.rankIcon').parentElement.classList.add('correct');
  else
  if (rankDifference !== null && rankDifference <= 20)
    clone.querySelector('.rankIcon').parentElement.classList.add('close');
  else
    clone.querySelector('.rankIcon').parentElement.classList.add('incorrect');
  //DATE LOGIC
  clone.querySelector('.releaseDateIcon').textContent = data.release_year || 'Unknown Release Date';
  const dateDifference = todayAlbum ? Math.abs(todayAlbum.release_year - data.release_year) : null;

  if (dateDifference !== null && dateDifference === 0)
    clone.querySelector('.releaseDateIcon').parentElement.classList.add('correct');
  else if (dateDifference !== null && dateDifference <= 10)
    clone.querySelector('.releaseDateIcon').parentElement.classList.add('close');
  else
    clone.querySelector('.releaseDateIcon').parentElement.classList.add('incorrect');

  //Album type logic
  clone.querySelector('.albumTypeIcon').textContent = data.type || 'Unknown Album Type';

  //Label logic
  clone.querySelector('.labelIcon').textContent = data.label_name || 'Unknown Label';

  //Genre logic
  clone.querySelector('.genreIcon').textContent = data.genres.split(";").join("/") || 'Unknown Genre';

  let memberDifference = todayAlbum ? Math.abs(todayAlbum.artist_member_count - data.artist_member_count) : null;
  // If the difference is 0, we consider it correct
  if (memberDifference !== null && memberDifference === 0)
    clone.querySelector('.groupMemberIcon').parentElement.classList.add('correct');
  else if (memberDifference !== null && memberDifference < 1)
    clone.querySelector('.groupMemberIcon').parentElement.classList.add('close');
  else
    clone.querySelector('.groupMemberIcon').parentElement.classList.add('incorrect');
  let memberCount = (Number(data.artist_member_count) === 1) ? 'Solo' :
    (Number(data.artist_member_count) === 2) ? 'Duo' :
      (`${capitalize(t("group"))} (${data.artist_member_count})` || 'Unknown Group Members');
  clone.querySelector('.groupMemberIcon').textContent = memberCount;
  if (data.country.length === 2)
    clone.querySelector('.locationIcon').textContent = (data.country !== '') ? getFlagEmoji(data.country) : 'Unknown Location';
  else
    clone.querySelector('.locationIcon').textContent = data.country
  return clone;
}

// Run on load
window.addEventListener('DOMContentLoaded', async () => {
  initLanguage();
  await loadAlbumCSV();
  const todayAlbum = getAlbumOfTheDay();
  //console.log("Album of the Day:", todayAlbum);
  knownTracksList.innerHTML = ''; // Clear previous tracks
  if (todayAlbum) {
    // Populate the album cover hint
    albumHintCover.src = todayAlbum.large_thumbnails || 'fallback.jpg';
    // Populate the attempts left before reveal
    knownTracksList.innerHTML = todayAlbum.top_songs
      ? todayAlbum.top_songs.split(';').map(track => `<li>${track.trim()}</li>`).join('')
      : '<li>No top songs available</li>';
  }
  updateHints()
  populateCarousels(albumData);

});

//Autocomplete functionality

input.addEventListener('input', () => {
  const query = input.value.trim().toLowerCase();
  suggestionBox.innerHTML = '';
  autoCompleteIndex = -1;

  if (!query) {
    suggestionBox.style.display = 'none';
    return;
  }

  const matches = albumData
    .filter(a => (
      (a.album || '').toLowerCase().includes(query) ||
      (a.clean_name || '').toLowerCase().includes(query)
    ))
    .slice(0, 10);

  matches.forEach(album => {
    // Clone the template
    const template = document.getElementById('suggestionTemplate');
    const clone = template.content.cloneNode(true);
    // Fill in title & artist
    clone.querySelector('.suggestion-title').textContent = album.album;
    clone.querySelector('.suggestion-artist').textContent = album.clean_name;

    // Wrap in a div so we can style & attach events
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.dataset.album = album.album;
    item.dataset.artist = album.clean_name;
    item.appendChild(clone);

    // click handler
    item.addEventListener('click', () => {
      input.value = album.album;
      suggestionBox.style.display = 'none';
    });

    suggestionBox.appendChild(item);
  });

  suggestionBox.style.display = matches.length ? 'block' : 'none';
});

document.addEventListener('click', e => {
  if (e.target !== input && !suggestionBox.contains(e.target)) {
    suggestionBox.style.display = 'none';
  }
});
document.addEventListener('keydown', e => {
  const items = suggestionBox.querySelectorAll('.suggestion-item');
  if (items.length === 0 || suggestionBox.style.display === 'none') return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    autoCompleteIndex = (autoCompleteIndex + 1) % items.length;
    updateHighlight(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    autoCompleteIndex = (autoCompleteIndex - 1 + items.length) % items.length;
    updateHighlight(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (autoCompleteIndex >= 0 && autoCompleteIndex < items.length) {
      const selected = items[autoCompleteIndex];
      input.value = selected.dataset.album; // or combine artist if you want
      suggestionBox.style.display = 'none';
    }
  }
});

function updateHighlight(items) {
  items.forEach((item, index) => {
    item.classList.toggle('hover', index === autoCompleteIndex);
  });

  const activeItem = items[autoCompleteIndex];
  if (activeItem) {
    activeItem.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth'
    });
  }
}


// Event listener for the guess button
document.getElementById('guessButton').addEventListener('click', () => {
  const inputValue = document.getElementById('albumInput').value.trim().toLowerCase();
  if (!inputValue) return;

  const match = albumData.find(album =>
    (album.album || album.Album || '').toLowerCase() === inputValue
  );

  if (match) {
    evaluateAttempt(match);
  } else {
    console.log("No match found for:", inputValue);
  }
  document.getElementById('albumInput').value = ''; // Clear input after guess
});

function evaluateAttempt(attempt) {
  const todayAlbum = getAlbumOfTheDay();
  // Get today's album
  document.getElementById('attemptsList').prepend(createAlbumAttempt(attempt, todayAlbum));
  document.getElementById('attemptsContainer').scrollTo({ top: 0, behavior: 'smooth' });
  attempts.push(attempt);
  updateHints();

  if (todayAlbum === attempt) {
    document.getElementById(String(attempts.length) + '-attempt').classList.add('correct');
    revealAnswer(todayAlbum);
    return;
  }
  if (attempts.length === maxAttempts) {
    revealAnswer(todayAlbum, false);
    return;
  }

  // If not correct, add 'incorrect' class to the attempt and update stats
  document.getElementById(String(attempts.length) + '-attempt').classList.add('incorrect');
  updateAlbumInformation(todayAlbum, attempt);


}

function updateAlbumInformation(todayAlbum, attempt) {

  //ARTIST NAME LOGIC
  if (todayAlbum.clean_name && attempt.clean_name && todayAlbum.clean_name.toLowerCase() === attempt.clean_name.toLowerCase())
    artistName.textContent = todayAlbum.clean_name;

  // RANK LOGIC
  const ranks = attempts.map(a => Number(a.rank_2020)).filter(n => !isNaN(n));
  let rankResult = numericLogic(ranks, todayAlbum.rank_2020,true);
  let rankText = rankResult.closest;
  rankInfo.textContent = rankText;
  if ('direction' in rankResult) {
    rankInfo.appendChild(createArrow('arrow', rankResult.direction));
  }
  // RELEASE YEAR LOGIC
  const releases = attempts.map(a => Number(a.release_year)).filter(n => !isNaN(n));
  let releaseResult = numericLogic(releases, todayAlbum.release_year);
  releaseDateInfo.textContent = releaseResult.closest;
  if ('direction' in releaseResult) {
    releaseDateInfo.appendChild(createArrow('arrow', releaseResult.direction));
  }

  const genres = Array.from(new Set(
    attempts
      .map(a => a.genres)
      .filter(Boolean)
      .flatMap(g => g.split(';'))
      .map(g => g.trim())
      .filter(g => g.length > 0)
  ));

  let genreDisplayInfo = genreLogic(genres, todayAlbum.genres);
  genreInfo.textContent = genreDisplayInfo.display;

  // TYPE LOGIC
  const types = attempts.map(a => a.type).filter(Boolean);
  const find = types.find(type => type === todayAlbum.type);
  if (find) {
    typeInfo.textContent = todayAlbum.type;
  }

  // MEMBERS LOGIC
  const members = attempts.map(a => a.artist_member_count).filter(Boolean);
  let memberText = memberLogic(members, todayAlbum.artist_member_count);
  groupMembersInfo.textContent = memberText.display;


  // LOCATION LOGIC
  const locations = attempts.map(a => a.country).filter(Boolean);
  let locationText = locationLogic(locations, todayAlbum.country);
  locationInfo.textContent = locationText.display;


  // LABEL LOGIC
  const labels = attempts.map(a => a.label_name).filter(Boolean);
  const findLabel = labels.find(label => label === todayAlbum.label_name);
  if (findLabel) {
    labelInfo.textContent = todayAlbum.label_name;
  }
}
function revealEverything() {
  const todayAlbum = getAlbumOfTheDay();
  if (!todayAlbum) return;

  updateAlbumInformation(todayAlbum, todayAlbum);
  revealHint('cover');
  revealHint('tracks');
  document.getElementById(`albumHintCover`).style.filter = 'none';
  document.getElementById(`albumHintCover`).style.transform = 'none';
  const title = todayAlbum.album || 'Unknown Album';
  document.getElementById('albumTitle').innerHTML = title;
}

function createArrow(iconName,direction = true) {
  const iconElement = document.createElement("img");
  iconElement.className = "fonticon";
  iconElement.src = `assets/${iconName}.svg`;
  iconElement.style.transform = direction ? 'rotate(0deg)' : 'rotate(180deg)';
  return iconElement;
}


function updateHints() {
  const attemptsLeft = maxAttempts - attemptsBeforeCover - attempts.length;
  attemptsLeftBeforeReveal.textContent = attemptsLeft;
  if (attemptsLeft === 0) {
    document.getElementById("revealHintLeftButton").disabled = false;
    document.getElementById("attemptsLeftBeforeReveal").innerHTML = t("hint-available");
  }
  const attemptsRight = maxAttempts - attemptsBeforeTracks - attempts.length;
  attemptsRightBeforeReveal.textContent = attemptsRight;
  if (attemptsRight === 0) {
    document.getElementById("revealHintRightButton").disabled = false;
    document.getElementById("attemptsRightBeforeReveal").innerHTML = t("hint-available");
  }
}

function revealHint(hintType) {
  const todayAlbum = getAlbumOfTheDay();
  if (!todayAlbum) return;
  switch (hintType) {
    case 'cover':
      document.querySelector("#leftInformationPart .hint").style.display = 'block';
      document.querySelector("#leftInformationPart .reveal-hint").style.display = 'none';
      break;
    case 'tracks':
      document.querySelector("#rightInformationPart .hint").style.display = 'block';
      document.querySelector("#rightInformationPart .reveal-hint").style.display = 'none';
      break;
    default:
      console.error("Unknown hint type:", hintType);
  }

}



function numericLogic(values, aimValue, isReverse = false) {
  if (!Array.isArray(values) || values.length === 0) {
    return 'Unknown';
  }

  aimValue = Number(aimValue);
  if (isNaN(aimValue)) {
    return 'Unknown';
  }
  if (values.includes(aimValue)) {

     return {"closest" :String(aimValue)}
  }


  if (values.length === 1) {
    if (isReverse) {
      const direction = values[0] < aimValue ? false : true;
      return {"closest" : values[0],  "direction" : direction}
    } else {
      const direction = values[0] > aimValue ? false : true;
      return {"closest" : values[0],  "direction" : direction}
  }
}

  let minRange = null;

  // Look for the smallest range that includes aimValue
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      const a = values[i];
      const b = values[j];
      const low = Math.min(a, b);
      const high = Math.max(a, b);

      if (aimValue >= low && aimValue <= high) {
        const size = high - low;
        if (!minRange || size < minRange.size) {
          minRange = { low, high, size };
        }
      }
    }
  }

  if (minRange) {
    return {"closest" : `${minRange.low} - ${minRange.high}`};
  }

  // If no valid range found, return nearest value + arrow
  let closest = values[0];
  let minDiff = Math.abs(values[0] - aimValue);

  for (let val of values) {
    const diff = Math.abs(val - aimValue);
    if (diff < minDiff) {
      minDiff = diff;
      closest = val;
    }
  }

//True = up, False = down
  let direction = closest < aimValue ? true : false;
  if (isReverse)
    direction = closest > aimValue ? true : false;
  return {"closest" : closest,  "direction" : direction}
}

function genreLogic(genres, aimGenres) {
  if (!Array.isArray(genres) || genres.length === 0 || !aimGenres) {
    return {
      display: '?/?/?',
      color: getInterpolatedColor(0)
    };
  }

  // Normalize and split both genres and aimGenres
  const knownGenresSet = new Set(
    genres
      .flatMap(g => g.split(';'))
      .map(g => g.trim().toLowerCase())
  );

  const targetGenres = aimGenres.split(';').map(g => g.trim());

  let found = 0;
  const display = targetGenres.map(g => {
    if (knownGenresSet.has(g.toLowerCase())) {
      found++;
      return g;
    }
    return '?';
  }).join('/');

  const ratio = found / targetGenres.length;
  const color = getInterpolatedColor(ratio);

  return { display, color };
}



function memberLogic(members, aimMember) {
  if (!Array.isArray(members) || members.length === 0 || !aimMember) {
    return {
      display: '?',
      color: null
    };
  }

  const found = members.find(member => member === aimMember);
  if (found) {
    if (Number(aimMember) === 1)
      return {
        display: "Solo",
        color: getInterpolatedColor(1)
      };
    else if (Number(aimMember) === 2)
      return {
        display: "Duo",
        color: getInterpolatedColor(1)
      };
    else
      return {
        display: `${capitalize(t("group"))} (${aimMember})`,
        color: getInterpolatedColor(1)
      };
  }
  else {
    if (Number(aimMember) < 1.0 || Number(aimMember) === 2.0)
      return {
        display: "??????",
        color: null
      };
    else {
      if (members.find(member => Number(member) > 1.0) !== undefined)
        return {
          display: `${capitalize(t("group"))} (?)`,
          color: getInterpolatedColor(0.5)
        };
    }
  }
  return {
    display: "??????",
    color: null
  };
}


function locationLogic(locations, aimLocation) {
  if (!Array.isArray(locations) || locations.length === 0 || !aimLocation) {
    return {
      display: '?',
      color: null
    };
  }

  const found = locations.find(location => location.toLowerCase() === aimLocation.toLowerCase());

  if (found) {
    return {
      display: found,
      color: getInterpolatedColor(1)
    };
  }
  else {
    return {
      display: '?',
      color: null
    }
  }
}



function getInterpolatedColor(ratio) {
  // Clamp between 0 and 1
  ratio = Math.max(0, Math.min(1, ratio));
  switch (ratio) {
    case 0:
      return 'rgb(255,0,0)'; // Red
    case 1:
      return 'rgb(0,200,0)'; // Green
    default:
      // Interpolate between red and green
      return '#ffd23d';
  }

}


async function revealAnswer(album, hasWin = true) {
  if (hasWin) {
    document.getElementById('revealMessage').textContent = t("reveal.win");
    document.getElementById("subtitle").textContent = `${t("reveal.subtitle")} ${attempts.length} / ${maxAttempts} ${t("attempts")}!`;
    launchTopConfettiBurst()
  } else {
    document.getElementById('revealMessage').textContent = t("reveal.lose");
  }
  document.getElementById('guessContainer').style.display = "none";
  document.getElementById('revealAnswer').style.display = "flex";

  revealEverything();
  /*
    if (album.spotify_url && album.spotify_url.includes(':')) {
      const id = album.spotify_url.split(":").pop();
      document.getElementById('revealSpotify').href = `https://open.spotify.com/album/${id}`;
    }
  
    document.getElementById('revealSection').style.display = "flex"
    document.getElementById('gameSection').style.display = "none"
    */
}


// #region CAROUSEL LOGIC

async function populateCarousels(data) {
  const leftTrack = document.querySelector('.left .carousel:nth-child(1) .carousel-track');
  const leftTrackReverse = document.querySelector('.left .carousel:nth-child(2) .carousel-track');

  const rightTrack = document.querySelector('.right .carousel:nth-child(1) .carousel-track');
  const rightTrackReverse = document.querySelector('.right .carousel:nth-child(2) .carousel-track');


  if (!leftTrack || !leftTrackReverse || !rightTrack || !rightTrackReverse) {
    console.error("One or more carousel containers not found.");
    return;
  }
  let maxVH = 20
  while(window.innerWidth < 0.04*maxVH * window.innerHeight)
  {
    maxVH-=5
  }
  const minVH = maxVH-5


  // Shuffle and get 40 items
  const shuffled = [...data].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 40);

  // Async loading of tracks (can be awaited if needed)
  loadCarouselTrack(leftTrack, selected, 0, 10,minVH);
  applyRandomScrollSpeed(leftTrack, false);
  loadCarouselTrack(leftTrackReverse, selected, 10, 20,minVH);
  applyRandomScrollSpeed(leftTrackReverse, true);
  loadCarouselTrack(rightTrack, selected, 20, 30,minVH);
  applyRandomScrollSpeed(rightTrack, false);
  loadCarouselTrack(rightTrackReverse, selected, 30, 40,minVH);
  applyRandomScrollSpeed(rightTrackReverse, true);
}

async function loadCarouselTrack(track, data, start, end, maxVH) {
  if (!track) return;

  track.innerHTML = '';

  const elements = [];

  // Create once
  for (let i = start; i < end; i++) {
    const item = data[i];
    const el = createImageElement(item,maxVH);
    elements.push(el);
    track.appendChild(el);
  }

  // Clone and append for looping
  for (const el of elements) {
    const clone = el.cloneNode(true);
    track.appendChild(clone);
  }
}



function createImageElement(item,maxVH) {
  const { small_thumbnails,  album, clean_name, release_year } = item;

  const template = document.getElementById('carouselImageTemplate');
  const clone = template.content.cloneNode(true);
  const img = clone.querySelector('.carousel-image');
  img.src = small_thumbnails;
  img.alt = album || "Album cover";
  //img.title = album || "Album cover";
  img.style.objectFit = "cover";
  img.style.borderRadius = "10px";
  // 🔥 Random square size using vh (e.g., max VH and +5 )
  let size = maxVH + Math.random() * 5; // Between 15vh–20vh
  img.style.width = `${size}vh`;
  img.style.height = `${size}vh`;

  size = size + 2
  const text = `<b>${album}<em> ${clean_name} </em>(${release_year})</b>`;
  clone.querySelector('.tooltip-text').style.width = `${size}vh`;
  clone.querySelector('.tooltip-text').style.bottom = "80%";
  clone.querySelector('.tooltip-text').style.left = "50%";
  clone.querySelector('.tooltip-text').style.transform = "translateY(50%)";
  clone.querySelector('.tooltip-text').style.transform = "translateX(-50%)";
  clone.querySelector('.tooltip-text').innerHTML = text;
  return clone;
}

function applyRandomScrollSpeed(track, isReverse = false) {
  const duration = 50 + Math.random() * 10; // Between 50s–60s
  track.style.animationDuration = `${duration}s`;

  // Defensive: ensure correct animation name
  track.style.animationName = isReverse ? 'scroll-down' : 'scroll-up';
}

// #endregion
function getFlagEmoji(countryCode) {
  return regionNames.of(countryCode);
}


function launchConfetti(x, y) {
  const colors = ['#f94144', '#f3722c', '#f9c74f', '#90be6d', '#43aa8b', '#577590'];
  const count = 80;

  for (let i = 0; i < count; i++) {
    const confetti = document.createElement('div');
    confetti.classList.add('confetti-piece');

    confetti.style.left = `${x}px`;
    confetti.style.top = `${y}px`;
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDuration = `${1 + Math.random() * 0.8}s`;

    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * 150 + 50;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;

    confetti.style.setProperty('--dx', `${dx}px`);
    confetti.style.setProperty('--dy', `${dy}px`);
    confetti.style.setProperty('--rz', `${Math.random() * 360}deg`);

    document.body.appendChild(confetti);

    setTimeout(() => confetti.remove(), 2000);
  }
}

async function launchTopConfettiBurst() {
  const launches = 25;

  for (let i = 0; i < launches; i++) {
    const delay = Math.random() * (100 - 50) + 50; // 50ms–100ms
    setTimeout(() => {
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * (window.innerHeight * 0.3); // top 30%
      launchConfetti(x, y);
    }, i * delay);
  }
}


/*#region LANGUAGE LOGIC */
function initLanguage() {
  // Detect browser language
  const browserLang = navigator.language || navigator.userLanguage; // e.g. "en-US", "fr-FR"
  const shortLang = browserLang.split('-')[0]; // "en" or "fr"

  // Supported languages
  const supportedLangs = ['en', 'fr'];

  // Check if saved lang exists in localStorage
  let lang = localStorage.getItem("lang");

  if (!lang) {
    // If no saved language, use browser lang if supported, else default to 'en'
    lang = supportedLangs.includes(shortLang) ? shortLang : 'en';
  }

  //languageSelect.value = lang;
  loadLanguage(lang);
  /*
    languageSelect.addEventListener("change", (e) => {
      const newLang = e.target.value;
      localStorage.setItem("lang", newLang);
      loadLanguage(newLang);
    });
  */
}
function loadLanguage(lang) {
  fetch(`lang/${lang}.json`)
    .then((response) => response.json())
    .then((translations) => {
      currentTranslations = translations; // Save globally
      applyTranslations(translations);
    })
    .catch((err) => console.error("Failed to load language file:", err));
}


function applyTranslations(translations) {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const translation = getNestedTranslation(translations, key);

    if (translation) {
      // Support for tooltips (title), placeholders, textContent
      if (el.hasAttribute("placeholder")) {
        el.setAttribute("placeholder", translation);
      }
       else if (el.hasAttribute("title")) {
        el.setAttribute("title", translation);
      }

      if (el.placeholder !== undefined) {
        el.placeholder = translation;
      } else if (el.value !== undefined && el.tagName === "INPUT") {
        el.value = translation;
      } else {
        el.textContent = translation;
      }
    }
  });
}

function getNestedTranslation(obj, key) {
  return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);
}

function t(key) {
  return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : key), currentTranslations);
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}