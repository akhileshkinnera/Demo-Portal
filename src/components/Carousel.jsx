import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { classifyLink, safeImageUrl } from '../utils/links';
import './Carousel.css';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);
  return reduced;
}

function Slide({ slide, active }) {
  const [imgFailed, setImgFailed] = useState(false);
  const image = safeImageUrl(slide.imageUrl);
  const link = classifyLink(slide.linkUrl);
  const linkText = slide.linkText || 'Learn more';

  return (
    <div
      className="carousel__slide"
      role="group"
      aria-roledescription="slide"
      aria-hidden={!active}
      data-testid="carousel-slide"
    >
      {image && !imgFailed && (
        <img className="carousel__img" src={image} alt="" loading="lazy" onError={() => setImgFailed(true)} />
      )}
      <div className="carousel__shade" />
      <div className="carousel__content">
        <h2 className="carousel__title">{slide.title}</h2>
        {slide.text && <p className="carousel__text">{slide.text}</p>}
        {link?.type === 'internal' && (
          <Link to={link.to} className="btn btn--light btn--sm" tabIndex={active ? 0 : -1}>{linkText}</Link>
        )}
        {link?.type === 'external' && (
          <a href={link.href} className="btn btn--light btn--sm" target="_blank" rel="noopener noreferrer" tabIndex={active ? 0 : -1}>
            {linkText}
          </a>
        )}
      </div>
    </div>
  );
}

export default function Carousel({ slides = [], interval = 5000 }) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);
  const reducedMotion = usePrefersReducedMotion();

  // Keep the index valid if the slides change (for example after a reload).
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  const goTo = useCallback((i) => setIndex(((i % count) + count) % count), [count]);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // Automatic sliding. The timer restarts after every change, so manual navigation gets a full interval.
  useEffect(() => {
    if (count < 2 || paused || reducedMotion) return undefined;
    const id = setTimeout(() => setIndex((i) => (i + 1) % count), interval);
    return () => clearTimeout(id);
  }, [count, paused, reducedMotion, interval, index]);

  if (!count) return null;

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
  };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  };

  return (
    <section
      className="carousel"
      aria-roledescription="carousel"
      aria-label="Announcements"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onKeyDown={onKeyDown}
    >
      <div className="carousel__viewport">
        <div className="carousel__track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((slide, i) => (
            <Slide key={slide.id || i} slide={slide} active={i === index} />
          ))}
        </div>
      </div>

      {count > 1 && (
        <>
          <button type="button" className="carousel__arrow carousel__arrow--prev" onClick={prev} aria-label="Previous slide">
            <Icon name="chevronLeft" />
          </button>
          <button type="button" className="carousel__arrow carousel__arrow--next" onClick={next} aria-label="Next slide">
            <Icon name="chevronRight" />
          </button>

          <div className="carousel__dots">
            {slides.map((slide, i) => (
              <button
                key={slide.id || i}
                type="button"
                className={i === index ? 'carousel__dot carousel__dot--active' : 'carousel__dot'}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
              />
            ))}
          </div>
        </>
      )}

      <div className="sr-only" aria-live="polite">{`Slide ${index + 1} of ${count}`}</div>
    </section>
  );
}
