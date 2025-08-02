
// Global variable to store the parsed CSV data
let albumData = [];
let attempts = [];
let attemptNumber = 1;
const maxAttempts = 6;
const attemptsBeforeCover = 3;
const attemptsBeforeTracks = 2;
let autocompleteInputValues = [];
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
let fullDisplayRank = document.getElementById('fullDisplayRank');
let fullDisplayReleaseDate = document.getElementById('fullDisplayReleaseDate');
let fullDisplayGenre = document.getElementById('fullDisplayGenre');
let fullDisplayAlbumType = document.getElementById('fullDisplayAlbumType');
let fullDisplayGroupMembers = document.getElementById('fullDisplayGroupMembers');
let fullDisplayLocation = document.getElementById('fullDisplayLocation');
let fullDisplayLabel = document.getElementById('fullDisplayLabel');
let artistName = document.getElementById('artistName');

//Game section needed


let attemptsLeftBeforeReveal = document.getElementById('attemptsLeft');
let attemptsRightBeforeReveal = document.getElementById('attemptsRight');

let albumHintCover = document.getElementById('albumHintCover');

let knownTracksList = document.getElementById('knownTracksList');
let revealTracksButton = document.getElementById('revealHintButton');


async function loadAlbumCSV() {
  try {
    const response = await fetch('albums.csv');
    const text = await response.text();
    albumData = parseCSV(text);
    console.log("CSV loaded:", albumData.length, "albums");
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

  if (rankDifference !== null && rankDifference <= 20)
    clone.querySelector('.rankIcon').parentElement.classList.add('close');
  else
    clone.querySelector('.rankIcon').parentElement.classList.add('incorrect');
  //DATE LOGIC
  clone.querySelector('.releaseDateIcon').textContent = data.release_year || 'Unknown Release Date';
  const dateDifference = todayAlbum ? Math.abs(todayAlbum.release_year - data.release_year) : null;

  if (dateDifference !== null && dateDifference <= 10)
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
      (`Group (${data.artist_member_count})` || 'Unknown Group Members');
  clone.querySelector('.groupMemberIcon').textContent = memberCount;
  if (data.country.length === 2)
    clone.querySelector('.locationIcon').textContent = (data.country != '') ? getFlagEmoji(data.country) : 'Unknown Location';
  else
    clone.querySelector('.locationIcon').textContent = data.country
  return clone;
}

// Run on load
window.addEventListener('DOMContentLoaded', async () => {
  await loadAlbumCSV();
  const todayAlbum = getAlbumOfTheDay();
  console.log("Album of the Day:", todayAlbum);
  knownTracksList.innerHTML = ''; // Clear previous tracks
  if (todayAlbum) {
    // Populate the album cover hint
    albumHintCover.src = todayAlbum.large_thumbnails || 'fallback.jpg';
    albumHintCover.alt = todayAlbum.album || 'Unknown Album Cover';
    albumHintCover.title = todayAlbum.album || 'Unknown Album Cover';
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
  if (todayAlbum === attempt) {
    document.getElementById(String(attempts.length) + '-attempt').classList.add('correct');
    revealAnswer(todayAlbum);
    return;
  }
  document.getElementById('attemptsList').prepend(createAlbumAttempt(attempt,todayAlbum));
  document.getElementById('attemptsContainer').scrollTo({ top: 0, behavior: 'smooth' });
  attempts.push(attempt);
  attemptNumber++;
  updateHints();

  if (attempts.length === maxAttempts) {
    revealAnswer(todayAlbum, false);
    return;
  }

  // If not correct, add 'incorrect' class to the attempt and update stats

  //ARTIST NAME LOGIC
  if (todayAlbum.clean_name && attempt.clean_name && todayAlbum.clean_name.toLowerCase() === attempt.clean_name.toLowerCase())
    artistName.textContent = todayAlbum.clean_name;
  document.getElementById(String(attempts.length) + '-attempt').classList.add('incorrect');
  // RANK LOGIC
  const ranks = attempts.map(a => Number(a.rank_2020)).filter(n => !isNaN(n));
  let rankText = numericLogic(ranks, todayAlbum.rank_2020, fullDisplayRank.id, true);
  rankInfo.textContent = rankText;

  // RELEASE YEAR LOGIC
  const releases = attempts.map(a => Number(a.release_year)).filter(n => !isNaN(n));
  let releaseText = numericLogic(releases, todayAlbum.release_year, fullDisplayReleaseDate.id);
  releaseDateInfo.textContent = releaseText;

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


function updateHints() {
  const attemptsLeft = maxAttempts - attemptsBeforeCover - attempts.length;
  attemptsLeftBeforeReveal.textContent = attemptsLeft;
  if (attemptsLeft == 0)
    document.getElementById("revealHintLeftButton").disabled = false;
  const attemptsRight = maxAttempts - attemptsBeforeTracks - attempts.length;
  attemptsRightBeforeReveal.textContent = attemptsRight;
  if (attemptsRight == 0)
    document.getElementById("revealHintRightButton").disabled = false;

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



function numericLogic(values, aimValue, idElement, isReverse = false) {
  if (!Array.isArray(values) || values.length === 0) {
    return 'Unknown';
  }

  aimValue = Number(aimValue);
  if (isNaN(aimValue)) {
    return 'Unknown';
  }
  if (values.includes(aimValue)) {
    document.getElementById(idElement).classList.add('correct');
    return String(aimValue);
  }

  document.getElementById(idElement).classList.add('soso');
  if (values.length === 1) {
    if (!isReverse)
      return (values[0] > aimValue) ? `${values[0]} ↓` : `${values[0]} ↑`;
    else
      return (values[0] < aimValue) ? `${values[0]} ↓` : `${values[0]} ↑`;
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
    return `${minRange.low} - ${minRange.high}`;
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


  let direction = closest < aimValue ? '↑' : '↓';
  if (isReverse)
    direction = closest > aimValue ? '↑' : '↓';
  return `${closest} ${direction}`;
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
        display: "Group (" + aimMember + ")",
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
          display: "Group (?)",
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




function revealAnswer(album, hasWin = true) {
  if (hasWin)
    document.getElementById('revealMessage').textContent = "Congratulations! You guessed it right!";
  else
    document.getElementById('revealMessage').textContent = "Loser !🫵🫵";
  const revealAlbum = createAlbumAttempt(album);
  document.getElementById("revealAlbumContainer").appendChild(revealAlbum);

  if (album.spotify_url && album.spotify_url.includes(':')) {
    const id = album.spotify_url.split(":").pop();
    document.getElementById('revealSpotify').href = `https://open.spotify.com/album/${id}`;
  }

  document.getElementById('revealSection').style.display = "flex"
  document.getElementById('gameSection').style.display = "none"
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

  // Shuffle and get 40 items
  const shuffled = [...data].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 40);

  // Async loading of tracks (can be awaited if needed)
  loadCarouselTrack(leftTrack, selected, 0, 10);
  applyRandomScrollSpeed(leftTrack, false);
  loadCarouselTrack(leftTrackReverse, selected, 10, 20);
  applyRandomScrollSpeed(leftTrackReverse, true);
  loadCarouselTrack(rightTrack, selected, 20, 30);
  applyRandomScrollSpeed(rightTrack, false);
  loadCarouselTrack(rightTrackReverse, selected, 30, 40);
  applyRandomScrollSpeed(rightTrackReverse, true);
}

async function loadCarouselTrack(track, data, start, end) {
  if (!track) return;

  track.innerHTML = '';

  const elements = [];

  // Create once
  for (let i = start; i < end; i++) {
    const item = data[i];
    const el = createImageElement(item);
    elements.push(el);
    track.appendChild(el);
  }

  // Clone and append for looping
  for (const el of elements) {
    const clone = el.cloneNode(true);
    track.appendChild(clone);
  }
}



function createImageElement(item) {
  const { small_thumbnails, album_id, album, clean_name, release_year } = item;

  const template = document.getElementById('carouselImageTemplate');
  const clone = template.content.cloneNode(true);
  const img = clone.querySelector('.carousel-image');
  img.src = small_thumbnails;
  img.alt = album || "Album cover";
  //img.title = album || "Album cover";
  img.style.objectFit = "cover";
  img.style.borderRadius = "10px";
  const text = `<b>${album}<em> ${clean_name} </em>(${release_year})</b>` ;
  clone.querySelector('.tooltip-text').style.bottom = "80%";
  clone.querySelector('.tooltip-text').style.left = "50%";
  clone.querySelector('.tooltip-text').style.transform = "translateY(50%)";
  clone.querySelector('.tooltip-text').style.transform = "translateX(-50%)";
  clone.querySelector('.tooltip-text').innerHTML = text;
  // 🔥 Random square size using vh (e.g., 15vh to 20vh)
  const size = 15 + Math.random() * 5; // Between 15vh–20vh
  img.style.width = `${size}vh`;
  img.style.height = `${size}vh`;
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
