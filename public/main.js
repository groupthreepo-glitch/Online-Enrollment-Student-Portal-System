document.addEventListener('DOMContentLoaded', function() {
    // Modal functionality
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const closeBtns = document.querySelectorAll('.close-modal');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    const exploreBtn = document.getElementById('exploreBtn');
    const enrollNowBtn = document.getElementById('enrollNowBtn');

    // Redirect to login.html for actual login/registration
    loginBtn.addEventListener('click', function() {
        window.location.href = 'login.html';
    });

    registerBtn.addEventListener('click', function() {
        window.location.href = 'login.html?form=register';
    });

    // Handle explore button
    exploreBtn.addEventListener('click', function() {
        window.location.href = 'login.html';
    });

    // Handle enroll now button
    enrollNowBtn.addEventListener('click', function() {
        window.location.href = 'login.html?form=register';
    });

    // Tab functionality for the portal preview section
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabBtns.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Show corresponding content
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(`${tabId}-content`).classList.add('active');
        });
    });

    // FAQ accordion functionality
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        const icon = item.querySelector('.faq-toggle i');

        question.addEventListener('click', () => {
            // Close all other answers
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.querySelector('.faq-answer').style.display = 'none';
                    otherItem.querySelector('.faq-toggle i').className = 'fas fa-plus';
                }
            });

            // Toggle current answer
            if (answer.style.display === 'block') {
                answer.style.display = 'none';
                icon.className = 'fas fa-plus';
            } else {
                answer.style.display = 'block';
                icon.className = 'fas fa-minus';
            }
        });
    });

    // Testimonial slider functionality
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    const dots = document.querySelectorAll('.slider-dots .dot');
    const prevBtn = document.getElementById('prevTestimonial');
    const nextBtn = document.getElementById('nextTestimonial');
    let currentIndex = 0;

    function showTestimonial(index) {
        // Hide all testimonials
        testimonialCards.forEach(card => card.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        // Show selected testimonial
        testimonialCards[index].classList.add('active');
        dots[index].classList.add('active');
        currentIndex = index;
    }

    // Event listeners for dots
    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const index = parseInt(dot.getAttribute('data-index'));
            showTestimonial(index);
        });
    });

    // Event listeners for prev/next buttons
    prevBtn.addEventListener('click', () => {
        let newIndex = currentIndex - 1;
        if (newIndex < 0) newIndex = testimonialCards.length - 1;
        showTestimonial(newIndex);
    });

    nextBtn.addEventListener('click', () => {
        let newIndex = currentIndex + 1;
        if (newIndex >= testimonialCards.length) newIndex = 0;
        showTestimonial(newIndex);
    });

    // Mobile navigation
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        hamburger.classList.toggle('active');
    });

    // Contact form submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Your message has been sent. We will get back to you soon!');
            contactForm.reset();
        });
    }
});