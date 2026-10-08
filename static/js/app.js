// State Management
let allNotes = [];
let activeCategory = "All";
let searchQuery = "";
let selectedNote = null;
let userHasEditedTweet = false;

// DOM Elements
const searchInput = document.getElementById("search-input");
const clearSearchBtn = document.getElementById("clear-search-btn");
const notesList = document.getElementById("notes-list");
const skeletonLoader = document.getElementById("skeleton-loader");
const emptyState = document.getElementById("empty-state");
const refreshBtn = document.getElementById("refresh-btn");
const refreshIcon = document.getElementById("refresh-icon");
const lastUpdatedText = document.getElementById("last-updated-text");
const syncStatus = document.getElementById("sync-status");

// Category filter buttons
const filterAll = document.getElementById("filter-all");
const filterFeature = document.getElementById("filter-feature");
const filterAnnouncement = document.getElementById("filter-announcement");
const filterSecurity = document.getElementById("filter-security");
const filterChange = document.getElementById("filter-change");
const filterBreaking = document.getElementById("filter-breaking");
const categoryButtons = [filterAll, filterFeature, filterAnnouncement, filterSecurity, filterChange, filterBreaking];

// Modal Elements
const tweetModal = document.getElementById("tweet-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const cancelTweetBtn = document.getElementById("cancel-tweet-btn");
const sendTweetBtn = document.getElementById("send-tweet-btn");
const tweetTextarea = document.getElementById("tweet-textarea");
const includeUrlCheckbox = document.getElementById("include-url-checkbox");
const includeTagsCheckbox = document.getElementById("include-tags-checkbox");
const charProgress = document.getElementById("char-progress");
const charCountLabel = document.getElementById("char-count-label");
const previewBadge = document.getElementById("preview-badge");
const previewDate = document.getElementById("preview-date");
const previewNoteText = document.getElementById("preview-note-text");
const toastContainer = document.getElementById("toast-container");

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    // Initialize Lucide Icons
    lucide.createIcons();
    
    // Fetch initial notes
    fetchNotes();

    // Event Listeners
    setupEventListeners();
});

// Setup All Interactive Event Listeners
function setupEventListeners() {
    // Refresh / Sync
    refreshBtn.addEventListener("click", () => fetchNotes(true));

    // Search Input
    searchInput.addEventListener("input", handleSearch);
    clearSearchBtn.addEventListener("click", clearSearch);

    // Category Buttons
    categoryButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            categoryButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeCategory = btn.getAttribute("data-category");
            renderNotes();
        });
    });

    // Modal Controls
    closeModalBtn.addEventListener("click", closeTweetModal);
    cancelTweetBtn.addEventListener("click", closeTweetModal);
    sendTweetBtn.addEventListener("click", handleSendTweet);
    tweetTextarea.addEventListener("input", handleTweetInput);
    
    // Checkbox toggles in modal
    includeUrlCheckbox.addEventListener("change", () => {
        if (!userHasEditedTweet) composeTweetContent();
    });
    includeTagsCheckbox.addEventListener("change", () => {
        if (!userHasEditedTweet) composeTweetContent();
    });

    // Close Modal on overlay click
    tweetModal.addEventListener("click", (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });
}

// Fetch Notes from API
async function fetchNotes(forceRefresh = false) {
    // Set loading state
    setLoadingState(true);
    
    const url = forceRefresh ? "/api/notes?refresh=true" : "/api/notes";
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === "success" || result.status === "warning") {
            allNotes = result.notes;
            
            // Render updates
            renderNotes();
            updateCategoryCounts();
            
            // Update last-sync labels
            const now = new Date();
            lastUpdatedText.textContent = `Updated: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            
            if (result.status === "warning") {
                showToast(result.message, "info");
                syncStatus.textContent = "Offline Fallback";
                syncStatus.style.color = "var(--accent-yellow)";
            } else {
                if (forceRefresh) showToast("Release notes synchronized successfully", "success");
                syncStatus.textContent = "Connected";
                syncStatus.style.color = "var(--text-secondary)";
            }
        } else {
            throw new Error(result.message || "Failed to load release notes");
        }
    } catch (error) {
        console.error("Error fetching release notes:", error);
        showToast(`Sync Failed: ${error.message}`, "error");
        
        // Hide loader if failed
        skeletonLoader.style.display = "none";
        if (allNotes.length === 0) {
            emptyState.style.display = "flex";
        }
    } finally {
        setLoadingState(false);
    }
}

// Toggle loading view states
function setLoadingState(isLoading) {
    if (isLoading) {
        refreshBtn.disabled = true;
        refreshIcon.classList.add("spinning");
        skeletonLoader.style.display = "flex";
        notesList.style.display = "none";
        emptyState.style.display = "none";
    } else {
        refreshBtn.disabled = false;
        refreshIcon.classList.remove("spinning");
        skeletonLoader.style.display = "none";
    }
}

// Render the list of notes based on active Category and Search query
function renderNotes() {
    // Filter notes
    const filtered = allNotes.filter(note => {
        const matchesCategory = (activeCategory === "All" || note.category === activeCategory);
        const matchesSearch = searchQuery === "" || 
            note.content_text.toLowerCase().includes(searchQuery) ||
            note.category.toLowerCase().includes(searchQuery) ||
            note.date.toLowerCase().includes(searchQuery);
            
        return matchesCategory && matchesSearch;
    });

    // Clear previous
    notesList.innerHTML = "";

    if (filtered.length === 0) {
        notesList.style.display = "none";
        emptyState.style.display = "flex";
        return;
    }

    emptyState.style.display = "none";
    notesList.style.display = "flex";

    // Build DOM elements for notes
    filtered.forEach((note, index) => {
        const card = document.createElement("article");
        card.className = "note-card";
        card.setAttribute("data-category", note.category);
        
        // Badge CSS class selector
        const badgeClass = `badge-${note.category.toLowerCase()}`;
        
        card.innerHTML = `
            <div class="note-header">
                <div class="note-meta">
                    <span class="badge ${badgeClass}">${note.category}</span>
                    <span class="date-label">${note.date}</span>
                </div>
                <div class="note-actions">
                    <button class="action-icon-btn share" title="Share on Twitter/X" aria-label="Share update on Twitter">
                        <i data-lucide="twitter"></i>
                    </button>
                </div>
            </div>
            <div class="note-body">
                ${note.content_html}
            </div>
            <div class="note-footer">
                ${note.url ? `
                <a href="${note.url}" target="_blank" rel="noopener noreferrer" class="doc-link">
                    Source Document <i data-lucide="external-link" class="tiny-icon"></i>
                </a>
                ` : '<span></span>'}
                <button class="btn btn-secondary btn-sm tweet-trigger-btn">
                    <i data-lucide="twitter" class="btn-icon"></i>
                    <span>Tweet This</span>
                </button>
            </div>
        `;
        
        // Add tweet event listener
        const tweetTriggerBtn = card.querySelector(".tweet-trigger-btn");
        const iconShareBtn = card.querySelector(".share");
        
        const openComposer = () => openTweetModal(note);
        tweetTriggerBtn.addEventListener("click", openComposer);
        iconShareBtn.addEventListener("click", openComposer);
        
        notesList.appendChild(card);
    });

    // Re-instantiate icons for dynamic elements
    lucide.createIcons();
}

// Compute aggregate release note stats for the Sidebar filter list
function updateCategoryCounts() {
    const counts = {
        All: allNotes.length,
        Feature: 0,
        Announcement: 0,
        Security: 0,
        Change: 0,
        Breaking: 0
    };

    allNotes.forEach(note => {
        if (counts.hasOwnProperty(note.category)) {
            counts[note.category]++;
        }
    });

    // Update labels in UI
    document.getElementById("count-all").textContent = counts.All;
    document.getElementById("count-feature").textContent = counts.Feature;
    document.getElementById("count-announcement").textContent = counts.Announcement;
    document.getElementById("count-security").textContent = counts.Security;
    document.getElementById("count-change").textContent = counts.Change;
    document.getElementById("count-breaking").textContent = counts.Breaking;
}

// Handle keyword search inputs
function handleSearch(e) {
    searchQuery = e.target.value.toLowerCase().trim();
    
    if (searchQuery.length > 0) {
        clearSearchBtn.style.display = "flex";
    } else {
        clearSearchBtn.style.display = "none";
    }
    
    renderNotes();
}

// Clear search input
function clearSearch() {
    searchInput.value = "";
    searchQuery = "";
    clearSearchBtn.style.display = "none";
    renderNotes();
    searchInput.focus();
}

/* Modal and Tweet Composition Core Logic */

// Open modal with pre-composed content
function openTweetModal(note) {
    selectedNote = note;
    userHasEditedTweet = false;
    
    // Set checkboxes back to default
    includeUrlCheckbox.checked = true;
    includeTagsCheckbox.checked = true;
    
    // Update Modal Preview elements
    previewBadge.className = `badge badge-${note.category.toLowerCase()}`;
    previewBadge.textContent = note.category;
    previewDate.textContent = note.date;
    previewNoteText.textContent = note.content_text;
    
    // Compose base tweet message
    composeTweetContent();
    
    // Open Modal display
    tweetModal.style.display = "flex";
    document.body.style.overflow = "hidden"; // Disable background scrolling
    tweetTextarea.focus();
}

// Compose standard template message based on options
function composeTweetContent() {
    if (!selectedNote) return;
    
    const includeUrl = includeUrlCheckbox.checked;
    const includeTags = includeTagsCheckbox.checked;
    
    // Pre-calculate tweet components lengths
    const prefix = `📢 BigQuery [${selectedNote.category}] (${selectedNote.date}):\n`;
    
    let suffix = "";
    if (includeUrl && selectedNote.url) {
        suffix += `\n🔗 Source: ${selectedNote.url}`;
    }
    if (includeTags) {
        suffix += "\n#BigQuery #GoogleCloud";
    }
    
    // Max characters allowed for the text body
    const maxBodyLength = 280 - prefix.length - suffix.length;
    
    let body = selectedNote.content_text;
    if (body.length > maxBodyLength) {
        // Truncate to fit nicely
        body = body.substring(0, maxBodyLength - 4).trim() + "...";
    }
    
    const finalTweet = `${prefix}${body}${suffix}`;
    
    tweetTextarea.value = finalTweet;
    updateCharProgress(finalTweet.length);
}

// Handle User typing directly in the composer
function handleTweetInput(e) {
    userHasEditedTweet = true;
    updateCharProgress(e.target.value.length);
}

// Update Character limit meters and labels
function updateCharProgress(length) {
    charCountLabel.textContent = `${length} / 280`;
    
    const percentage = Math.min((length / 280) * 100, 100);
    charProgress.style.width = `${percentage}%`;
    
    // Color indicators
    charProgress.className = "progress-bar-fill";
    charCountLabel.className = "char-count";
    
    if (length > 280) {
        charProgress.classList.add("danger");
        charCountLabel.classList.add("danger");
        sendTweetBtn.disabled = true;
    } else if (length > 250) {
        charProgress.classList.add("warning");
        charCountLabel.classList.add("warning");
        sendTweetBtn.disabled = false;
    } else {
        sendTweetBtn.disabled = false;
    }
}

// Close Tweet Composer modal
function closeTweetModal() {
    tweetModal.style.display = "none";
    document.body.style.overflow = "visible"; // Re-enable background scrolling
    selectedNote = null;
}

// Direct to Twitter Web Intent with text
function handleSendTweet() {
    const text = tweetTextarea.value;
    
    if (text.length > 280) {
        showToast("Tweet exceeds the 280-character limit", "error");
        return;
    }
    
    // Official Web Intent URL
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    
    // Open Twitter intent in new window
    window.open(twitterIntentUrl, "_blank");
    
    // Close modal & confirm action to user
    closeTweetModal();
    showToast("Redirected to Twitter share composer", "success");
}

/* Toast Notifications Helper */
function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let iconName = "check-circle";
    if (type === "error") iconName = "alert-circle";
    if (type === "info") iconName = "info";
    
    toast.innerHTML = `
        <i data-lucide="${iconName}" class="toast-icon"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    lucide.createIcons();
    
    // Remove toast after animation finishes
    setTimeout(() => {
        toast.remove();
    }, 3100); // 2.7s stay + 0.4s fade animation
}
