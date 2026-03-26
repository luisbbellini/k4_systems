// --- CONFIG & ELEMENTS ---
const navbar = document.getElementById('navbar');
const mobileBtn = document.querySelector('.mobile-menu-btn');
const mobileIcon = mobileBtn.querySelector('i');
const navLinks = document.querySelector('.nav-links');
const navLinkItems = document.querySelectorAll('.nav-links li a');

// --- NAVBAR BEHAVIOR ---
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
        if (!navLinks.classList.contains('active')) {
             navLinks.style.background = 'transparent';
        }
    }
});

// --- MOBILE MENU ---
mobileBtn.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    if (navLinks.classList.contains('active')) {
        mobileIcon.classList.remove('ph-list');
        mobileIcon.classList.add('ph-x');
        navLinks.style.background = 'var(--color-primary)';
    } else {
        mobileIcon.classList.remove('ph-x');
        mobileIcon.classList.add('ph-list');
        if (window.scrollY < 50) {
             navLinks.style.background = 'transparent';
        }
    }
});

// Close mobile menu when a link is clicked
navLinkItems.forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        mobileIcon.classList.remove('ph-x');
        mobileIcon.classList.add('ph-list');
    });
});

// --- SCROLL ANIMATIONS (Intersection Observer) ---
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target); // Run once
        }
    });
}, observerOptions);

document.querySelectorAll('.observe').forEach(element => {
    observer.observe(element);
});

// --- CURRENT YEAR FOR FOOTER ---
document.getElementById('current-year').textContent = new Date().getFullYear();

// --- SMOOTH SCROLL (For browsers that don't support CSS scroll-behavior well) ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            e.preventDefault();
            const headerOffset = 80;
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.scrollY - headerOffset;
  
            window.scrollTo({
                 top: offsetPosition,
                 behavior: "smooth"
            });
        }
    });
});

// Add subtle parallax to hero shape
document.addEventListener('mousemove', (e) => {
    const cards = document.querySelectorAll('.glass-card');
    const xAxis = (window.innerWidth / 2 - e.pageX) / 50;
    const yAxis = (window.innerHeight / 2 - e.pageY) / 50;

    cards.forEach(card => {
        card.style.transform = `translate(${xAxis}px, ${yAxis}px)`;
    });
});

// --- PROMO BANNER ---
document.addEventListener('DOMContentLoaded', () => {
    const promoBanner = document.getElementById('promo-banner');
    const closePromoBtn = document.getElementById('close-promo');
    const promoCtaBtn = document.getElementById('promo-cta');

    if (promoBanner && closePromoBtn) {
        // Mostrar o banner após 3 segundos toda vez
        setTimeout(() => {
            promoBanner.classList.add('show');
        }, 3000);

        const hideBanner = () => {
            promoBanner.classList.remove('show');
            promoBanner.classList.add('hide');
        };

        closePromoBtn.addEventListener('click', hideBanner);
        if (promoCtaBtn) {
            promoCtaBtn.addEventListener('click', hideBanner);
        }
    }
});
