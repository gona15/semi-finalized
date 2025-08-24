// Performance and Accessibility-First JavaScript
// Solo freelancer marketing site - ArmanLeads

(function() {
    'use strict';

    // State management
    const state = {
        mobileNavOpen: false,
        currentModalId: null,
        isSubmitting: false,
        focusableSelectors: 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        sections: ['hero', 'services', 'portfolio', 'pricing', 'faq', 'contact']
    };

    // Utility functions
    const utils = {
        // Enhanced DOM selector with null check
        $: (selector, context = document) => {
            const element = context.querySelector(selector);
            return element;
        },

        // Multiple elements selector
        $$: (selector, context = document) => {
            return Array.from(context.querySelectorAll(selector));
        },

        // Check if user prefers reduced motion
        prefersReducedMotion: () => {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        },

        // Get all focusable elements within container
        getFocusableElements: (container) => {
            if (!container) return [];
            return utils.$$(state.focusableSelectors, container).filter(el => {
                return el.offsetWidth > 0 && el.offsetHeight > 0 && !el.hasAttribute('hidden');
            });
        },

        // Trap focus within container
        trapFocus: (container, event) => {
            const focusableElements = utils.getFocusableElements(container);
            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.key === 'Tab') {
                if (event.shiftKey) {
                    if (document.activeElement === firstElement) {
                        event.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        event.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        },

        // Debounce function for performance
        debounce: (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func.apply(this, args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        // Throttle function for scroll events
        throttle: (func, limit) => {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        // Email validation (RFC 5322 inspired, practical)
        isValidEmail: (email) => {
            const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
            return emailRegex.test(email);
        },

        // URL validation
        isValidUrl: (url) => {
            if (!url) return true; // URL is optional
            try {
                const urlObject = new URL(url);
                return urlObject.protocol === 'http:' || urlObject.protocol === 'https:';
            } catch {
                return false;
            }
        },

        // Animate element with proper reduced motion support
        animateElement: (element, animationClass, duration = 600) => {
            if (!element || utils.prefersReducedMotion()) return;
            
            element.classList.add(animationClass);
            setTimeout(() => {
                element.classList.remove(animationClass);
            }, duration);
        }
    };

    // Mobile Navigation Module
    const mobileNav = {
        init() {
            this.navToggle = utils.$('.nav-toggle');
            this.navMenu = utils.$('.nav-menu');
            this.navLinks = utils.$$('.nav-link, .nav-cta');
            this.body = document.body;
            this.lastFocusedElement = null;

            if (!this.navToggle || !this.navMenu) return;

            this.bindEvents();
        },

        bindEvents() {
            // Toggle button click
            this.navToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggle();
            });

            // Close on nav link click (mobile)
            this.navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (state.mobileNavOpen) {
                        this.close();
                    }
                });
            });

            // Keyboard support
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && state.mobileNavOpen) {
                    this.close();
                }
                
                // Focus trap when mobile nav is open
                if (state.mobileNavOpen) {
                    utils.trapFocus(this.navMenu, e);
                }
            });

            // Close on outside click (mobile only)
            document.addEventListener('click', (e) => {
                if (state.mobileNavOpen && 
                    !this.navMenu.contains(e.target) && 
                    !this.navToggle.contains(e.target)) {
                    this.close();
                }
            });

            // Handle resize
            window.addEventListener('resize', utils.debounce(() => {
                if (window.innerWidth >= 768 && state.mobileNavOpen) {
                    this.close();
                }
            }, 250));
        },

        toggle() {
            if (state.mobileNavOpen) {
                this.close();
            } else {
                this.open();
            }
        },

        open() {
            this.lastFocusedElement = document.activeElement;
            state.mobileNavOpen = true;
            
            this.navToggle.setAttribute('aria-expanded', 'true');
            this.navMenu.classList.add('is-open');
            this.body.style.overflow = 'hidden';
            this.navMenu.setAttribute('aria-hidden', 'false');

            // Focus first focusable element in menu
            const focusableElements = utils.getFocusableElements(this.navMenu);
            if (focusableElements.length > 0) {
                focusableElements[0].focus();
            }
        },

        close() {
            state.mobileNavOpen = false;
            
            this.navToggle.setAttribute('aria-expanded', 'false');
            this.navMenu.classList.remove('is-open');
            this.body.style.overflow = '';
            this.navMenu.setAttribute('aria-hidden', 'true');

            // Return focus to toggle button
            if (this.lastFocusedElement) {
                this.lastFocusedElement.focus();
                this.lastFocusedElement = null;
            }
        }
    };

    // Modal Management Module
    const modal = {
        init() {
            this.modals = utils.$$('.modal');
            this.triggers = utils.$$('[data-modal-trigger]');
            this.lastFocusedElement = null;

            if (this.modals.length === 0 && this.triggers.length === 0) return;

            this.bindEvents();
        },

        bindEvents() {
            // Modal trigger buttons
            this.triggers.forEach(trigger => {
                trigger.addEventListener('click', (e) => {
                    e.preventDefault();
                    const modalId = trigger.getAttribute('data-modal-trigger');
                    this.open(modalId);
                });
            });

            // Close buttons and backdrop clicks
            this.modals.forEach(modalElement => {
                const closeButtons = utils.$$('[data-modal-close]', modalElement);
                
                closeButtons.forEach(closeBtn => {
                    closeBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.close();
                    });
                });
            });

            // Keyboard support
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && state.currentModalId) {
                    this.close();
                }
                
                // Focus trap when modal is open
                if (state.currentModalId) {
                    const currentModal = utils.$(`#${state.currentModalId}-modal`);
                    if (currentModal) {
                        utils.trapFocus(currentModal, e);
                    }
                }
            });
        },

        open(modalId) {
            const modalElement = utils.$(`#${modalId}-modal`);
            if (!modalElement) return;

            this.lastFocusedElement = document.activeElement;
            state.currentModalId = modalId;

            // Set modal attributes
            modalElement.setAttribute('aria-hidden', 'false');
            modalElement.setAttribute('aria-modal', 'true');
            modalElement.removeAttribute('hidden');
            modalElement.classList.add('fade-in');
            
            // Lock body scroll
            document.body.classList.add('modal-open');

            // Focus management
            const focusableElements = utils.getFocusableElements(modalElement);
            if (focusableElements.length > 0) {
                focusableElements[0].focus();
            }

            // Animation for modal content
            setTimeout(() => {
                modalElement.classList.add('scale-in');
            }, 50);
        },

        close() {
            if (!state.currentModalId) return;

            const modalElement = utils.$(`#${state.currentModalId}-modal`);
            if (!modalElement) return;

            // Animation out
            modalElement.classList.remove('scale-in');
            modalElement.classList.add('fade-out');

            setTimeout(() => {
                modalElement.classList.remove('fade-in', 'fade-out');
                modalElement.setAttribute('aria-hidden', 'true');
                modalElement.removeAttribute('aria-modal');
                modalElement.setAttribute('hidden', '');
                
                // Unlock body scroll
                document.body.classList.remove('modal-open');

                // Return focus
                if (this.lastFocusedElement) {
                    this.lastFocusedElement.focus();
                    this.lastFocusedElement = null;
                }

                state.currentModalId = null;
            }, 250);
        }
    };

    // Form Validation and Submission Module
    const formHandler = {
        init() {
            this.form = utils.$('#audit-form');
            this.submitButton = utils.$('.btn-submit');
            this.loadingDiv = utils.$('#form-loading');
            this.successDiv = utils.$('#form-success');

            if (!this.form) return;

            this.fields = {
                name: utils.$('#name'),
                email: utils.$('#email'),
                businessType: utils.$('#business-type'),
                website: utils.$('#website'),
                message: utils.$('#message')
            };

            this.errors = {
                name: utils.$('#name-error'),
                email: utils.$('#email-error'),
                businessType: utils.$('#business-type-error'),
                website: utils.$('#website-error'),
                message: utils.$('#message-error')
            };

            this.bindEvents();
        },

        bindEvents() {
            // Form submission
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });

            // Real-time validation
            Object.keys(this.fields).forEach(fieldName => {
                const field = this.fields[fieldName];
                if (field) {
                    field.addEventListener('blur', () => this.validateField(fieldName));
                    field.addEventListener('input', utils.debounce(() => {
                        if (field.getAttribute('aria-invalid') === 'true') {
                            this.validateField(fieldName);
                        }
                    }, 500));
                }
            });
        },

        validateField(fieldName) {
            const field = this.fields[fieldName];
            const errorElement = this.errors[fieldName];
            
            if (!field || !errorElement) return true;

            let isValid = true;
            let errorMessage = '';

            const value = field.value.trim();

            switch (fieldName) {
                case 'name':
                    if (!value) {
                        isValid = false;
                        errorMessage = 'Please enter your name';
                    } else if (value.length < 2) {
                        isValid = false;
                        errorMessage = 'Name must be at least 2 characters';
                    }
                    break;

                case 'email':
                    if (!value) {
                        isValid = false;
                        errorMessage = 'Please enter your email address';
                    } else if (!utils.isValidEmail(value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid email address';
                    }
                    break;

                case 'businessType':
                    if (!value) {
                        isValid = false;
                        errorMessage = 'Please select your business type';
                    }
                    break;

                case 'website':
                    // Website is optional, but if provided must be valid
                    if (value && !utils.isValidUrl(value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid URL (include http:// or https://)';
                    }
                    break;

                case 'message':
                    // Message is optional, but check length if provided
                    if (value && value.length > 2000) {
                        isValid = false;
                        errorMessage = 'Message is too long (maximum 2000 characters)';
                    }
                    break;
            }

            // Update field and error states
            if (isValid) {
                field.classList.remove('error');
                field.setAttribute('aria-invalid', 'false');
                errorElement.setAttribute('hidden', '');
                field.removeAttribute('aria-describedby');
            } else {
                field.classList.add('error');
                field.setAttribute('aria-invalid', 'true');
                field.setAttribute('aria-describedby', errorElement.id);
                errorElement.textContent = errorMessage;
                errorElement.removeAttribute('hidden');
            }

            return isValid;
        },

        validateForm() {
            const requiredFields = ['name', 'email', 'businessType'];
            const optionalFields = ['website', 'message'];
            
            let isFormValid = true;

            // Validate required fields
            requiredFields.forEach(fieldName => {
                if (!this.validateField(fieldName)) {
                    isFormValid = false;
                }
            });

            // Validate optional fields that have values
            optionalFields.forEach(fieldName => {
                const field = this.fields[fieldName];
                if (field && field.value.trim()) {
                    if (!this.validateField(fieldName)) {
                        isFormValid = false;
                    }
                }
            });

            return isFormValid;
        },

        async handleSubmit() {
            if (state.isSubmitting) return;

            // Validate form
            if (!this.validateForm()) {
                // Focus first error field
                const firstErrorField = utils.$('.form-input.error, .form-select.error');
                if (firstErrorField) {
                    firstErrorField.focus();
                }
                return;
            }

            state.isSubmitting = true;
            this.setSubmitState('loading');

            try {
                const formData = new FormData(this.form);
                
                // Get form action (Formspree endpoint)
                const formAction = this.form.action;
                if (!formAction) {
                    throw new Error('Form action URL not found');
                }

                const response = await fetch(formAction, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    this.setSubmitState('success');
                    this.resetForm();
                } else {
                    const data = await response.json();
                    if (data.errors) {
                        this.handleFormErrors(data.errors);
                    } else {
                        throw new Error('Form submission failed');
                    }
                }
            } catch (error) {
                console.error('Form submission error:', error);
                this.setSubmitState('error');
            }

            state.isSubmitting = false;
        },

        handleFormErrors(errors) {
            errors.forEach(error => {
                if (error.field) {
                    const fieldName = error.field;
                    const field = this.fields[fieldName];
                    const errorElement = this.errors[fieldName];
                    
                    if (field && errorElement) {
                        field.classList.add('error');
                        field.setAttribute('aria-invalid', 'true');
                        field.setAttribute('aria-describedby', errorElement.id);
                        errorElement.textContent = error.message || 'Invalid input';
                        errorElement.removeAttribute('hidden');
                    }
                }
            });
            
            this.setSubmitState('idle');
        },

        setSubmitState(newState) {
            switch (newState) {
                case 'loading':
                    if (this.submitButton) {
                        this.submitButton.disabled = true;
                        this.submitButton.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Sending...';
                    }
                    if (this.loadingDiv) {
                        this.loadingDiv.removeAttribute('hidden');
                    }
                    if (this.successDiv) {
                        this.successDiv.setAttribute('hidden', '');
                    }
                    break;

                case 'success':
                    if (this.loadingDiv) {
                        this.loadingDiv.setAttribute('hidden', '');
                    }
                    if (this.successDiv) {
                        this.successDiv.removeAttribute('hidden');
                        this.successDiv.setAttribute('role', 'status');
                        this.successDiv.focus();
                    }
                    if (this.submitButton) {
                        this.submitButton.disabled = false;
                        this.submitButton.innerHTML = '<i class="fas fa-paper-plane" aria-hidden="true"></i> Send My Free Audit';
                    }
                    break;

                case 'error':
                    if (this.loadingDiv) {
                        this.loadingDiv.setAttribute('hidden', '');
                    }
                    if (this.submitButton) {
                        this.submitButton.disabled = false;
                        this.submitButton.innerHTML = '<i class="fas fa-paper-plane" aria-hidden="true"></i> Send My Free Audit';
                    }
                    // Could add error message display here
                    break;

                case 'idle':
                default:
                    if (this.submitButton) {
                        this.submitButton.disabled = false;
                        this.submitButton.innerHTML = '<i class="fas fa-paper-plane" aria-hidden="true"></i> Send My Free Audit';
                    }
                    if (this.loadingDiv) {
                        this.loadingDiv.setAttribute('hidden', '');
                    }
                    break;
            }
        },

        resetForm() {
            // Reset form fields
            this.form.reset();

            // Reset validation states
            Object.keys(this.fields).forEach(fieldName => {
                const field = this.fields[fieldName];
                const errorElement = this.errors[fieldName];
                
                if (field) {
                    field.classList.remove('error');
                    field.setAttribute('aria-invalid', 'false');
                    field.removeAttribute('aria-describedby');
                }
                
                if (errorElement) {
                    errorElement.setAttribute('hidden', '');
                }
            });
        }
    };

    // Preloader Removal Module
    const preloader = {
        init() {
            this.preloaderElement = utils.$('#preloader');
            if (!this.preloaderElement) return;

            // Remove preloader on window load
            window.addEventListener('load', () => {
                this.remove();
            });

            // Fallback: remove after 3 seconds regardless
            setTimeout(() => {
                this.remove();
            }, 3000);
        },

        remove() {
            if (this.preloaderElement) {
                this.preloaderElement.style.opacity = '0';
                this.preloaderElement.style.transition = 'opacity 0.3s ease-out';
                
                setTimeout(() => {
                    if (this.preloaderElement.parentNode) {
                        this.preloaderElement.parentNode.removeChild(this.preloaderElement);
                    }
                }, 300);
            }
        }
    };

    // Scroll Spy Module
    const scrollSpy = {
        init() {
            this.navLinks = utils.$$('.nav-link[href^="#"]');
            this.sections = [];
            
            // Get sections that exist in DOM
            state.sections.forEach(sectionId => {
                const section = utils.$(`#${sectionId}`);
                if (section) {
                    this.sections.push({ id: sectionId, element: section });
                }
            });

            if (this.sections.length === 0 || this.navLinks.length === 0) return;

            this.createObserver();
        },

        createObserver() {
            const options = {
                rootMargin: '-20% 0px -70% 0px',
                threshold: 0
            };

            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.setActiveNavLink(entry.target.id);
                    }
                });
            }, options);

            // Observe all sections
            this.sections.forEach(section => {
                this.observer.observe(section.element);
            });
        },

        setActiveNavLink(activeSectionId) {
            this.navLinks.forEach(link => {
                const href = link.getAttribute('href');
                const linkSectionId = href.substring(1); // Remove the #

                if (linkSectionId === activeSectionId) {
                    link.classList.add('active');
                    link.setAttribute('aria-current', 'page');
                } else {
                    link.classList.remove('active');
                    link.removeAttribute('aria-current');
                }
            });
        }
    };

    // Smooth Scroll Module
    const smoothScroll = {
        init() {
            this.anchorLinks = utils.$$('a[href^="#"]');
            if (this.anchorLinks.length === 0) return;

            this.bindEvents();
        },

        bindEvents() {
            this.anchorLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    const href = link.getAttribute('href');
                    const target = utils.$(href);
                    
                    if (target && href !== '#') {
                        e.preventDefault();
                        this.scrollToTarget(target);
                    }
                });
            });
        },

        scrollToTarget(target) {
            if (utils.prefersReducedMotion()) {
                target.scrollIntoView();
                return;
            }

            // Calculate offset for fixed header
            const header = utils.$('.site-header');
            const headerHeight = header ? header.offsetHeight : 0;
            const targetPosition = target.offsetTop - headerHeight - 20;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });

            // Focus management for accessibility
            setTimeout(() => {
                target.setAttribute('tabindex', '-1');
                target.focus();
                target.addEventListener('blur', () => {
                    target.removeAttribute('tabindex');
                }, { once: true });
            }, 500);
        }
    };

    // Header Scroll Effect
    const headerEffects = {
        init() {
            this.header = utils.$('.site-header');
            if (!this.header) return;

            this.lastScrollY = window.scrollY;
            this.bindEvents();
        },

        bindEvents() {
            window.addEventListener('scroll', utils.throttle(() => {
                this.handleScroll();
            }, 16)); // ~60fps
        },

        handleScroll() {
            const currentScrollY = window.scrollY;

            if (currentScrollY > 100) {
                this.header.classList.add('scrolled');
            } else {
                this.header.classList.remove('scrolled');
            }

            this.lastScrollY = currentScrollY;
        }
    };

    // Initialize all modules when DOM is ready
    function init() {
        // Feature detection
        if (!('querySelector' in document) || !('addEventListener' in window)) {
            return; // Graceful degradation for very old browsers
        }

        // Initialize modules
        preloader.init();
        mobileNav.init();
        modal.init();
        formHandler.init();
        scrollSpy.init();
        smoothScroll.init();
        headerEffects.init();

        // Set initial ARIA states
        const mobileNavMenu = utils.$('.nav-menu');
        if (mobileNavMenu) {
            mobileNavMenu.setAttribute('aria-hidden', 'true');
        }

        const modals = utils.$$('.modal');
        modals.forEach(modal => {
            modal.setAttribute('aria-hidden', 'true');
            modal.setAttribute('hidden', '');
        });

        console.log('ArmanLeads site initialized successfully');
    }

    // DOM ready check
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();