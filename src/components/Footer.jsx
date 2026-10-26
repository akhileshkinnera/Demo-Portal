import { APP_NAME } from '../config';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <span>&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</span>
        <span className="footer__muted">Secure access for authorised users only.</span>
      </div>
    </footer>
  );
}
