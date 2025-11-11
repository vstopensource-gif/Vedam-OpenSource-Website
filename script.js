// Debug logging disabled for production
const DEBUG = false;
function debugLog(...args) {
    if (DEBUG) console.log('[DEBUG]', ...args);
}
function debugWarn(...args) {
    if (DEBUG) console.warn('[WARN]', ...args);
}
function debugError(...args) {
    if (DEBUG) console.error('[ERROR]', ...args);
}

// ============================================================================
// SHARED AUTHENTICATION UTILITIES
// ============================================================================

// Environment detection functions
function isLocalhost() {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
}

// Simplified navigation: navigate immediately when needed

function isProduction() {
    const hostname = window.location.hostname;
    return hostname.includes('netlify.app') || 
           hostname.includes('vedamopensource.com') || 
           hostname.includes('vercel.app') ||
           (!isLocalhost() && hostname !== 'localhost' && hostname !== '127.0.0.1');
}

// Firebase configuration and initialization
// Firebase is now initialized in firebase-config.js module
// This provides backward compatibility for pages that expect window.initializeFirebase()

let auth, db;

async function initializeFirebase() {
    try {
        // Import Firebase services from the config module
        const firebaseModule = await import('./firebase-config.js');
        auth = firebaseModule.auth;
        db = firebaseModule.db;

        // Import Firestore functions
        const { doc, setDoc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

        window.auth = auth;
        window.db = db;
        window.doc = doc;
        window.setDoc = setDoc;
        window.getDoc = getDoc;
    } catch (error) {
        throw error;
    }
}

// Check user profile and redirect accordingly
// Decide destination based on existing registration and GitHub connection
async function checkUserProfileAndRedirect(userData) {
    try {
        if (!userData || !userData.uid) {
            return;
        }

        if (!window.db || !window.doc || !window.getDoc) {
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 10000);
            return;
        }

        const memberRef = window.doc(window.db, 'Members', userData.uid);
        const memberSnap = await window.getDoc(memberRef);
        const exists = memberSnap.exists();

        if (exists) {
            window.location.href = 'dashboard.html';
        } else {
            window.location.href = 'profile.html';
        }
    } catch (error) {
        // Error handling
    }
}

// Validate user access for protected pages (dashboard, etc.)
async function validateUserAccess() {
    try {
        const currentUser = (window.auth && window.auth.currentUser) || null;
        return !!currentUser;
    } catch {
        return false;
    }
}

// Simple authentication check - just verify user is logged in
async function validateUserLogin() {
    try {
        const currentUser = (window.auth && window.auth.currentUser) || null;
        return !!currentUser;
    } catch {
        return false;
    }
}

// Test function to debug stats loading
async function testStatsLoading() {
    try {
        const stats = await fetchClubStats();
        return stats;
    } catch (error) {
        return null;
    }
}

// Make functions available globally
window.isLocalhost = isLocalhost;
window.isProduction = isProduction;
window.initializeFirebase = initializeFirebase;
window.checkUserProfileAndRedirect = checkUserProfileAndRedirect;
window.validateUserAccess = validateUserAccess;
window.validateUserLogin = validateUserLogin;
window.testStatsLoading = testStatsLoading;

// ----------------------------------------------------------------------------
// Shared window.App API (non-breaking)
// ----------------------------------------------------------------------------
// Provide a minimal, idempotent API while preserving existing window.* exports
;(function initAppNamespace() {
    if (!window.App) window.App = {};
    if (!window.App.firebase) window.App.firebase = {};

    // Idempotent initializer used by multi-page consumers
    window.App.firebase.init = async function initFirebaseShared() {
        try {
            if (window.db && window.auth) {
                return { auth: window.auth, db: window.db };
            }
            await initializeFirebase();
            return { auth: window.auth, db: window.db };
        } catch (e) {
            throw e;
        }
    };
})();

// ============================================================================
// EXISTING UI FUNCTIONALITY
// ============================================================================

// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    }));
}

// Smooth scrolling for navigation links with active state management
const smoothScrollLinks = document.querySelectorAll('a[href^="#"]');
if (smoothScrollLinks.length > 0) {
    smoothScrollLinks.forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                // Remove active class from all nav links
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                });
                
                // Add active class to clicked link
                this.classList.add('active');
                
                // Smooth scroll to target
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Close mobile menu if open
                const hamburger = document.querySelector('.hamburger');
                const navMenu = document.querySelector('.nav-menu');
                if (hamburger && navMenu) {
                    hamburger.classList.remove('active');
                    navMenu.classList.remove('active');
                }
            }
        });
    });
}

// Update active nav link based on scroll position
function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.scrollY >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}

// Listen for scroll events to update active nav link
window.addEventListener('scroll', updateActiveNavLink);

// Navbar background change on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = 'none';
        }
    }
});

// Form submission handler
const contactForm = document.querySelector('.contact-form form');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(this);
        const name = this.querySelector('input[type="text"]').value;
        const email = this.querySelector('input[type="email"]').value;
        const message = this.querySelector('textarea').value;
        
        // Simple validation
        if (!name || !email || !message) {
            alert('Please fill in all fields.');
            return;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address.');
            return;
        }
        
        // Simulate form submission
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
        
        setTimeout(() => {
            alert('Thank you for your message! We\'ll get back to you soon.');
            this.reset();
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }, 2000);
    });
}

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Fetch REAL stats from Firebase collections
// This function aggregates data from all Members to show club-wide statistics
async function fetchClubStats() {
    try {
        // Ensure Firebase is initialized
        if (!window.db) {
            await window.initializeFirebase();
        }
        
        if (!window.db) {
            throw new Error('Firebase initialization failed');
        }

        // Import Firebase functions if not available
        if (!window.collection || !window.getDocs) {
            const { collection, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            window.collection = collection;
            window.getDocs = getDocs;
            window.query = query;
            window.where = where;
        }

        // Fetch all members from Firestore
        const membersSnapshot = await window.getDocs(window.collection(window.db, 'Members'));
        const totalMembers = membersSnapshot.size;
        
        // Initialize aggregation counters
        let totalRepos = 0;
        let totalStars = 0;
        let totalForks = 0;
        let membersWithGitHub = 0;
        let totalCommits = 0;
        let totalPullRequests = 0;

        // Sum up all GitHub activity from all members with connected GitHub accounts
        membersSnapshot.forEach((doc) => {
            const memberData = doc.data();
            
            // Only count members who have GitHub connected
            if (memberData.githubActivity) {
                membersWithGitHub++;
                
                // Aggregate GitHub metrics
                const repos = memberData.githubActivity.reposContributed || 0;
                const stars = memberData.githubActivity.totalStars || 0;
                const forks = memberData.githubActivity.totalForks || 0;
                const commits = memberData.githubActivity.commits || 0;
                const prs = memberData.githubActivity.pullRequests || 0;
                
                // Sum up totals for club-wide display
                totalRepos += repos;
                totalStars += stars;
                totalForks += forks;
                totalCommits += commits;
                totalPullRequests += prs;
            }
        });

        // Calculate events based on member activity and commits
        const eventsThisYear = Math.max(
            Math.floor(totalMembers / 15),
            Math.floor(totalCommits / 50),
            5
        );

        // Round off numbers to nearest 10 for better presentation
        const roundToNearest10 = (num) => {
            if (num === 0) return 0;
            if (num < 10) return 10;
            return Math.ceil(num / 10) * 10;
        };

        // Prepare stats object with rounded values for display
        const realStats = {
            members: roundToNearest10(totalMembers),
            projects: roundToNearest10(totalRepos),  // Total repos from all members
            stars: roundToNearest10(totalStars),
            events: roundToNearest10(eventsThisYear),
            membersWithGitHub: membersWithGitHub,
            totalCommits: totalCommits,
            totalPullRequests: totalPullRequests,
            totalForks: totalForks
        };
        
        // Cache the stats in Firebase for better performance
        // This allows faster loading on subsequent page loads
        try {
            await window.setDoc(window.doc(window.db, 'ClubStats', 'main'), {
                ...realStats,
                lastUpdated: new Date().toISOString(),
                calculatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (cacheError) {
            // Silently fail cache update - non-critical
        }
        
        return realStats;

    } catch (error) {
        // Fallback: Try to get from cached stats document in Firebase
        if (window.db && window.doc && window.getDoc) {
            try {
                const statsRef = window.doc(window.db, 'ClubStats', 'main');
                const statsSnap = await window.getDoc(statsRef);
                
                if (statsSnap.exists()) {
                    const cachedStats = statsSnap.data();
                    return {
                        members: cachedStats.members || 0,
                        projects: cachedStats.projects || 0,
                        stars: cachedStats.stars || 0,
                        events: cachedStats.events || 0
                    };
                }
            } catch (firestoreError) {
                // Silent fallback
            }
        }
        
        // Final fallback: Use realistic default values
        return {
            members: 0,
            projects: 0,
            stars: 0,
            events: 0
        };
    }
}

// Animated counter for stats with impressive effects
function animateCounter(element, target, duration = 2500) {
    let start = 0;
    const increment = target / (duration / 16);
    
    function updateCounter() {
        start += increment;
        if (start < target) {
            const currentValue = Math.floor(start);
            element.innerHTML = `<span class="counter-value">${currentValue}</span><span class="counter-plus">+</span>`;
            requestAnimationFrame(updateCounter);
        } else {
            element.innerHTML = `<span class="counter-value">${target}</span><span class="counter-plus">+</span>`;
            
            // Add celebration effect
            element.classList.add('celebrate');
            setTimeout(() => element.classList.remove('celebrate'), 1000);
        }
    }
    
    updateCounter();
}

// Load and display stats for both hero and stats sections
async function loadAndDisplayStats() {
    const statElements = {
        members: document.querySelector('[data-stat="members"]'),
        projects: document.querySelector('[data-stat="projects"]'),
        stars: document.querySelector('[data-stat="stars"]'),
        events: document.querySelector('[data-stat="events"]')
    };

    const heroElements = {
        members: document.getElementById('hero-members'),
        projects: document.getElementById('hero-projects'),
        stars: document.getElementById('hero-stars')
    };
    
    // Show loading spinners for both sections
    [...Object.values(statElements), ...Object.values(heroElements)].forEach(element => {
        if (element) {
            element.innerHTML = '<div class="loading-spinner"></div>';
        }
    });
    
    try {
        const stats = await fetchClubStats();
        
        // Update hero section immediately (no animation needed)
        if (heroElements.members) {
            heroElements.members.innerHTML = `<span class="counter-value">${stats.members}</span><span class="counter-plus">+</span>`;
        }
        if (heroElements.projects) {
            heroElements.projects.innerHTML = `<span class="counter-value">${stats.projects}</span><span class="counter-plus">+</span>`;
        }
        if (heroElements.stars) {
            heroElements.stars.innerHTML = `<span class="counter-value">${stats.stars}</span><span class="counter-plus">+</span>`;
        }

        // Update hero badge with real member count
        const heroMemberCount = document.getElementById('hero-member-count');
        if (heroMemberCount) {
            heroMemberCount.textContent = `${stats.members}+`;
        }
        
        // Animate stats section with dramatic effect
        const delays = [0, 200, 400, 600];
        const statKeys = ['members', 'projects', 'stars', 'events'];
        
        statKeys.forEach((key, index) => {
            setTimeout(() => {
                const element = statElements[key];
                if (element && stats[key] !== undefined) {
                    animateCounter(element, stats[key]);
                }
            }, delays[index]);
        });
        
        // Store stats for real-time updates
        window.currentClubStats = stats;
        
    } catch (error) {
        // Error handling
        
        // Show error state
        [...Object.values(statElements), ...Object.values(heroElements)].forEach(element => {
            if (element) {
                element.innerHTML = '<span class="error-text">--</span>';
            }
        });
    }
}

// Real-time stats updater (runs every 10 seconds for better responsiveness)
function startRealTimeStatsUpdate() {
    setInterval(async () => {
        try {
            const newStats = await fetchClubStats();
            const oldStats = window.currentClubStats || {};
            
            // Check if stats have changed
            if (JSON.stringify(newStats) !== JSON.stringify(oldStats)) {
                
                // Update hero section
                const heroElements = {
                    members: document.getElementById('hero-members'),
                    projects: document.getElementById('hero-projects'),
                    stars: document.getElementById('hero-stars')
                };
                
                if (heroElements.members && newStats.members !== oldStats.members) {
                    heroElements.members.innerHTML = `<span class="counter-value">${newStats.members}</span><span class="counter-plus">+</span>`;
                }
                if (heroElements.projects && newStats.projects !== oldStats.projects) {
                    heroElements.projects.innerHTML = `<span class="counter-value">${newStats.projects}</span><span class="counter-plus">+</span>`;
                }
                if (heroElements.stars && newStats.stars !== oldStats.stars) {
                    heroElements.stars.innerHTML = `<span class="counter-value">${newStats.stars}</span><span class="counter-plus">+</span>`;
                }

                // Update hero badge if member count changed
                if (newStats.members !== oldStats.members) {
                    const heroMemberCount = document.getElementById('hero-member-count');
                    if (heroMemberCount) {
                        heroMemberCount.textContent = `${newStats.members}+`;
                    }
                }
                
                // Update stats section with animation
                const statElements = {
                    members: document.querySelector('[data-stat="members"]'),
                    projects: document.querySelector('[data-stat="projects"]'),
                    stars: document.querySelector('[data-stat="stars"]'),
                    events: document.querySelector('[data-stat="events"]')
                };
                
                Object.keys(statElements).forEach(key => {
                    const element = statElements[key];
                    if (element && newStats[key] !== oldStats[key]) {
                        animateCounter(element, newStats[key], 1500); // Faster animation for updates
                    }
                });
                
                window.currentClubStats = newStats;
            }
        } catch (error) {
            // Error handling
        }
    }, 10000); // Update every 10 seconds
}

// Stats animation observer
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            loadAndDisplayStats();
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.3 });

// Observe elements for animation
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.about-card, .project-card, .contact-item, .feature-card');
    
    if (animatedElements.length > 0) {
        animatedElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    }

    // Load hero stats immediately
    loadAndDisplayStats();

    // Observe stats section for counter animation
    const statsSection = document.querySelector('.stats');
    if (statsSection) {
        statsObserver.observe(statsSection);
    }

    // Start real-time stats updates
    startRealTimeStatsUpdate();
});

// Add typing effect to hero title
function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Initialize typing effect when page loads
window.addEventListener('load', () => {
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const originalText = heroTitle.innerHTML;
        typeWriter(heroTitle, originalText, 50);
    }
});

// Add parallax effect to hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    if (hero) {
        const rate = scrolled * -0.5;
        hero.style.transform = `translateY(${rate}px)`;
    }
});

// Add hover effects to project cards
const projectCards = document.querySelectorAll('.project-card');
if (projectCards.length > 0) {
    projectCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// Add click effects to buttons
const buttons = document.querySelectorAll('.btn');
if (buttons.length > 0) {
    buttons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Create ripple effect
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// Add CSS for ripple effect
const style = document.createElement('style');
style.textContent = `
    .btn {
        position: relative;
        overflow: hidden;
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
