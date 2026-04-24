import React, { useEffect } from 'react';
import HomeHero from '../components/home/HomeHero';
import ActivityHighlights from '../components/home/ActivityHighlights';
import ReservationSteps from '../components/home/ReservationSteps';
import AnnouncementPreview from '../components/home/AnnouncementPreview';
import FAQSection from '../components/home/FAQSection';
import ContactSection from '../components/home/ContactSection';

export default function HomePage() {
  useEffect(() => {
    const hash = window.location.hash?.slice(1);
    if (hash) {
      const el = document.getElementById(hash);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    }
  }, []);

  return (
    <div>
      <HomeHero />
      <ActivityHighlights />
      <ReservationSteps />
      <AnnouncementPreview />
      <FAQSection />
      <ContactSection />
    </div>
  );
}
