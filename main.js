document.addEventListener("DOMContentLoaded", () => {
  // Testimonial interactive logic
  const testimonialContainer = document.getElementById("testimonial-container");
  if (testimonialContainer) {
    const testimonials = Array.from(
      testimonialContainer.querySelectorAll(".testimonial-card"),
    );
    let currentIndex = -1;

    function showNextTestimonial() {
      if (testimonials.length <= 1) return;

      let newIndex = currentIndex;
      while (newIndex === currentIndex) {
        newIndex = Math.floor(Math.random() * testimonials.length);
      }

      // Clear all active classes (especially important for the HTML fallback on first run)
      testimonials.forEach((t) => t.classList.remove("active"));

      // Force a reflow so the animation restarts
      void testimonials[newIndex].offsetWidth;
      testimonials[newIndex].classList.add("active");
      currentIndex = newIndex;
    }

    // Initialize with a random testimonial
    showNextTestimonial();

    // Change on click
    testimonialContainer.addEventListener("click", () => {
      showNextTestimonial();
      if (window.umami) umami.track("Testimonial - Next Click");
    });

    // Change on swipe/flick
    let touchStartX = 0;

    testimonialContainer.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.changedTouches[0].screenX;
      },
      { passive: true },
    );

    testimonialContainer.addEventListener(
      "touchend",
      (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        // If swipe distance is > 30px, trigger next
        if (Math.abs(touchEndX - touchStartX) > 30) {
          showNextTestimonial();
          if (window.umami) umami.track("Testimonial - Next Swipe");
        }
      },
      { passive: true },
    );
  }
});
