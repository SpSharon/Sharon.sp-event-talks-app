// Global State
let allReleases = [];
let activeTypeFilter = 'all';
let searchQuery = '';

// Constants
const TWITTER_CHAR_LIMIT = 280;
const TWEET_URL_PLACEHOLDER_LENGTH = 23; // Twitter wraps URLs and counts them as 23 chars
const BIGQUERY_NOTES_URL = "https://cloud.google.com/bigquery/docs/release-notes";

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const searchInput = document.getElementById('search-input');
const filterChips = document.querySelectorAll('.filter-chip');
const releasesGrid = document.getElementById('releases-grid');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const retryBtn = document.getElementById('retry-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const themeToggle = document.getElementById('theme-toggle');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetTextarea = document.getElementById('tweet-textarea');
const charProgressCircle = document.getElementById('char-progress');
const charCountText = document.getElementById('tweet-char-count');
const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
const submitTweetBtn = document.getElementById('submit-tweet-btn');
const closeModalBtn = document.getElementById('close-modal');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSavedTheme();
    fetchReleases();
    setupEventListeners();
    setupProgressRing();
});

// Event Listeners Setup
function setupEventListeners() {
    refreshBtn.addEventListener('click', fetchReleases);
    retryBtn.addEventListener('click', fetchReleases);
    exportCsvBtn.addEventListener('click', exportToCSV);
    themeToggle.addEventListener('change', toggleTheme);
    
    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        filterAndRenderReleases();
    });

    // Filter chips
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeTypeFilter = chip.getAttribute('data-type');
            filterAndRenderReleases();
        });
    });

    // Modal Close events
    closeModalBtn.addEventListener('click', closeTweetComposer);
    cancelTweetBtn.addEventListener('click', closeTweetComposer);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetComposer();
        }
    });

    // Textarea input event for character counting
    tweetTextarea.addEventListener('input', updateCharCount);

    // Tweet Submission
    submitTweetBtn.addEventListener('click', submitTweet);
}

// Fetch Releases from Backend
async function fetchReleases() {
    showLoading(true);
    showError(false, '');
    showEmpty(false);
    
    try {
        const response = await fetch('/api/releases');
        const data = await response.json();
        
        if (data.success && data.releases) {
            allReleases = data.releases;
            filterAndRenderReleases();
        } else {
            showError(true, data.error || 'Server returned an error');
        }
    } catch (err) {
        showError(true, 'Failed to fetch release notes from server. Check server connection.');
        console.error(err);
    } finally {
        showLoading(false);
    }
}

// Filtering and Rendering logic
function filterAndRenderReleases() {
    let filtered = allReleases;
    
    // 1. Filter by Type
    if (activeTypeFilter !== 'all') {
        filtered = filtered.filter(item => item.type === activeTypeFilter);
    }
    
    // 2. Filter by Search Query
    if (searchQuery) {
        filtered = filtered.filter(item => {
            const dateMatch = item.date.toLowerCase().includes(searchQuery);
            const contentMatch = item.plain_text.toLowerCase().includes(searchQuery);
            const typeMatch = item.type.toLowerCase().includes(searchQuery);
            return dateMatch || contentMatch || typeMatch;
        });
    }

    renderReleases(filtered);
}

// Render releases cards
function renderReleases(releases) {
    releasesGrid.innerHTML = '';
    
    if (releases.length === 0) {
        showEmpty(true);
        return;
    }
    
    showEmpty(false);
    
    releases.forEach((release, index) => {
        const card = document.createElement('article');
        card.className = 'release-card';
        
        // Define accent colors for cards based on type
        let accentColor = '#3b82f6'; // default blue
        let badgeClass = 'badge-general';
        
        if (release.type === 'Feature') {
            accentColor = '#10b981';
            badgeClass = 'badge-feature';
        } else if (release.type === 'Announcement') {
            accentColor = '#0ea5e9';
            badgeClass = 'badge-announcement';
        } else if (release.type === 'Bug Fix') {
            accentColor = '#a855f7';
            badgeClass = 'badge-bug';
        } else if (release.type === 'Deprecation') {
            accentColor = '#ef4444';
            badgeClass = 'badge-deprecation';
        }
        
        card.style.setProperty('--card-accent-color', accentColor);
        
        // Format relative time if possible, otherwise use original date_str
        const timeHTML = release.updated_date ? `<span class="card-time"><i class="fa-solid fa-clock"></i> ${formatDate(release.updated_date)}</span>` : '';
        
        card.innerHTML = `
            <div>
                <div class="card-header">
                    <div class="card-meta">
                        <h2 class="card-date">${release.date}</h2>
                        ${timeHTML}
                    </div>
                    <span class="badge ${badgeClass}">${release.type}</span>
                </div>
                <div class="card-content">
                    ${release.content_html}
                </div>
            </div>
            <div class="card-actions">
                <button class="btn-card-copy" onclick="copyToClipboard(this, ${index}, ${releases === allReleases ? 'true' : 'false'})">
                    <i class="fa-solid fa-copy"></i> <span>Copy</span>
                </button>
                <button class="btn-card-tweet" onclick="openTweetComposer(${index}, ${releases === allReleases ? 'true' : 'false'})">
                    <i class="fa-brands fa-x-twitter"></i> Tweet Update
                </button>
            </div>
        `;
        
        releasesGrid.appendChild(card);
    });
}

// Global scope wrapper for inline onclick (since cards are dynamically added)
window.openTweetComposer = function(index, useAllList) {
    const list = useAllList ? allReleases : getCurrentFilteredList();
    const release = list[index];
    if (!release) return;

    // Craft a premium default tweet:
    // Format: "BigQuery [Type] (Date): Plain Text Description... Link"
    // Keep space for the link and tags
    const link = BIGQUERY_NOTES_URL;
    const prefix = `BigQuery ${release.type} (${release.date}): `;
    const suffix = `\n\n#BigQuery #GCP ${link}`;
    
    // Calculate space for description
    // Twitter wraps URLs to 23 chars, plus newlines and prefix/suffix text
    const extraTextLength = prefix.length + 4 + TWEET_URL_PLACEHOLDER_LENGTH + 14; // newlines, tags, etc.
    const maxDescLength = TWITTER_CHAR_LIMIT - extraTextLength;
    
    let description = release.plain_text;
    if (description.length > maxDescLength) {
        description = description.substring(0, maxDescLength - 3) + "...";
    }
    
    const defaultTweet = `${prefix}"${description}"${suffix}`;
    
    // Set text in text area
    tweetTextarea.value = defaultTweet;
    
    // Open Modal
    tweetModal.classList.remove('hidden');
    updateCharCount();
    
    // Focus textarea
    setTimeout(() => tweetTextarea.focus(), 100);
}

function getCurrentFilteredList() {
    let filtered = allReleases;
    if (activeTypeFilter !== 'all') {
        filtered = filtered.filter(item => item.type === activeTypeFilter);
    }
    if (searchQuery) {
        filtered = filtered.filter(item => {
            const dateMatch = item.date.toLowerCase().includes(searchQuery);
            const contentMatch = item.plain_text.toLowerCase().includes(searchQuery);
            const typeMatch = item.type.toLowerCase().includes(searchQuery);
            return dateMatch || contentMatch || typeMatch;
        });
    }
    return filtered;
}

function closeTweetComposer() {
    tweetModal.classList.add('hidden');
    tweetTextarea.value = '';
}

// Character progress ring configuration
let ringCircumference = 0;

function setupProgressRing() {
    const radius = charProgressCircle.r.baseVal.value;
    ringCircumference = 2 * Math.PI * radius;
    
    charProgressCircle.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
    charProgressCircle.style.strokeDashoffset = ringCircumference;
}

function setProgress(percent) {
    const offset = ringCircumference - (percent / 100 * ringCircumference);
    charProgressCircle.style.strokeDashoffset = offset;
}

function updateCharCount() {
    const text = tweetTextarea.value;
    
    // Calculate length, correcting for Twitter's URL wrapping policy
    let length = text.length;
    
    // Find URLs in text and adjust length (substitute actual URL len with 23)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    if (urls) {
        urls.forEach(url => {
            length = length - url.length + TWEET_URL_PLACEHOLDER_LENGTH;
        });
    }
    
    const charsRemaining = TWITTER_CHAR_LIMIT - length;
    charCountText.innerText = charsRemaining;
    
    // Update progress ring
    const percentage = Math.min((length / TWITTER_CHAR_LIMIT) * 100, 100);
    setProgress(percentage);
    
    // Color coding based on length remaining
    charCountText.classList.remove('warn', 'danger');
    if (charsRemaining <= 0) {
        charProgressCircle.style.stroke = '#ef4444'; // Red
        charCountText.classList.add('danger');
        submitTweetBtn.disabled = true;
        submitTweetBtn.style.opacity = 0.5;
        submitTweetBtn.style.cursor = 'not-allowed';
    } else if (charsRemaining <= 20) {
        charProgressCircle.style.stroke = '#f59e0b'; // Amber
        charCountText.classList.add('warn');
        submitTweetBtn.disabled = false;
        submitTweetBtn.style.opacity = 1;
        submitTweetBtn.style.cursor = 'pointer';
    } else {
        charProgressCircle.style.stroke = '#3b82f6'; // Blue
        submitTweetBtn.disabled = false;
        submitTweetBtn.style.opacity = 1;
        submitTweetBtn.style.cursor = 'pointer';
    }
}

function submitTweet() {
    const text = tweetTextarea.value;
    if (!text || text.length === 0) return;
    
    // Generate Twitter Web Intent URL
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    
    // Open in a new tab
    window.open(intentUrl, '_blank');
    
    // Close composer
    closeTweetComposer();
}

// Helpers
function showLoading(isLoading) {
    if (isLoading) {
        refreshBtn.disabled = true;
        refreshIcon.classList.remove('paused');
        loadingState.classList.remove('hidden');
        releasesGrid.classList.add('hidden');
    } else {
        refreshBtn.disabled = false;
        refreshIcon.classList.add('paused');
        loadingState.classList.add('hidden');
        releasesGrid.classList.remove('hidden');
    }
}

function showError(show, message) {
    if (show) {
        errorMessage.innerText = message;
        errorState.classList.remove('hidden');
        releasesGrid.classList.add('hidden');
    } else {
        errorState.classList.add('hidden');
    }
}

function showEmpty(show) {
    if (show) {
        emptyState.classList.remove('hidden');
        releasesGrid.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
    }
}

function formatDate(isoString) {
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch (e) {
        return isoString;
    }
}

// Copy update plain text to clipboard
window.copyToClipboard = async function(btnElement, index, useAllList) {
    const list = useAllList ? allReleases : getCurrentFilteredList();
    const release = list[index];
    if (!release) return;

    const copyText = `BigQuery ${release.type} (${release.date}):\n${release.plain_text}`;

    try {
        await navigator.clipboard.writeText(copyText);
        
        // Show success animation/text change
        const icon = btnElement.querySelector('i');
        const span = btnElement.querySelector('span');
        
        btnElement.classList.add('success');
        icon.className = 'fa-solid fa-check';
        span.innerText = 'Copied!';
        
        setTimeout(() => {
            btnElement.classList.remove('success');
            icon.className = 'fa-solid fa-copy';
            span.innerText = 'Copy';
        }, 1500);
    } catch (err) {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy to clipboard.');
    }
}

// Export the currently filtered & searched list to a CSV file
function exportToCSV() {
    const list = getCurrentFilteredList();
    if (list.length === 0) {
        alert("No releases to export.");
        return;
    }

    const csvHeaders = ["Date", "Type", "Details", "Feed Link"];
    
    // Construct CSV Rows
    const csvRows = [
        csvHeaders.join(",") // Add header row
    ];

    list.forEach(item => {
        // Escape quotes by doubling them, wrap fields in quotes
        const dateField = `"${item.date.replace(/"/g, '""')}"`;
        const typeField = `"${item.type.replace(/"/g, '""')}"`;
        const detailsField = `"${item.plain_text.replace(/"/g, '""')}"`;
        const linkField = `"${BIGQUERY_NOTES_URL}"`;

        csvRows.push([dateField, typeField, detailsField, linkField].join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link and trigger click
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_releases_export_${dateStamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Theme management (Light / Dark)
function toggleTheme(e) {
    if (e.target.checked) {
        document.body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
    }
}

function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'light') {
        themeToggle.checked = true;
        document.body.classList.add('light-theme');
    } else {
        themeToggle.checked = false;
        document.body.classList.remove('light-theme');
    }
}
