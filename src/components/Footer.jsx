import React from 'react'
import { footerStyles } from '../assets/dummyStyles'

const Footer = () => {
  return (
      <footer className={footerStyles.container}>
          <div className={footerStyles.innerContainer}>
              <div className={footerStyles.content}>
                  <div className={footerStyles.logoContainer}>
                      <div>
                          <div className={footerStyles.copyright}>
                              &copy; {new Date().getFullYear()} Bibekananda Meher
                          </div>
                      </div>
                  </div>

                  <div className={footerStyles.navContainer}>
                      <nav className={footerStyles.nav}>
                          <a href="#live" className={footerStyles.navLink}>Live</a>
                          <a href="#upcoming" className={footerStyles.navLink}>Upcoming</a>
                          <a href="#about" className={footerStyles.navLink}>About</a>
                      </nav>

                      <div className={footerStyles.socialContainer}>

                          <a title="Twitter" href="#" className={footerStyles.socialLink}>
                              <svg className={footerStyles.socialIcon} viewBox="0 0 24 24" fill="none">
                                  <path d="M23 4.01c-.8.36-1.66.6-2.56.71.92-.55 1.62-1.43 1.95-2.48-.86.51-1.8.88-2.8 1.08C18.5 2.5 17.39 2 16.18 2c-2.2 0-3.99 1.78-3.99 3.98 0 .31.03.61.1.9C9.2 6.7 6.2 5 4 2.6c-.34.58-.53 1.25-.53 1.96 0 1.35.69 2.54 1.75 3.24-.64-.02-1.24-.2-1.76-.5v.05c0 1.9 1.36 3.48 3.16 3.84-.33.09-.68.13-1.04.13-.25 0-.5-.02-.74-.07.5 1.56 1.95 2.7 3.67 2.73-1.35 1.06-3.05 1.7-4.9 1.7-.32 0-.64-.02-.95-.06 1.77 1.14 3.88 1.8 6.14 1.8 7.38 0 11.42-6.12 11.42-11.42v-.52c.78-.56 1.45-1.26 1.98-2.06-.72.32-1.5.53-2.3.62.83-.5 1.46-1.28 1.76-2.22z" fill="currentColor" />
                              </svg>
                          </a>
                          <a title="GitHub" href="#" className={footerStyles.socialLink}>
                              <svg className={footerStyles.socialIcon} viewBox="0 0 24 24" fill="none">
                                  <path d="M12 2C6.48 2 2 6.58 2 12.2c0 4.5 2.87 8.32 6.84 9.67.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.71-2.78.61-3.37-1.36-3.37-1.36-.45-1.2-1.1-1.52-1.1-1.52-.9-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.64-1.36-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05A9.2 9.2 0 0 1 12 6.8c.85.01 1.71.12 2.51.36 1.9-1.33 2.74-1.05 2.74-1.05.56 1.4.21 2.44.11 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.35 4.8-4.59 5.06.36.32.68.95.68 1.92 0 1.39-.01 2.51-.01 2.85 0 .27.18.58.69.48A10.22 10.22 0 0 0 22 12.2C22 6.58 17.52 2 12 2z" fill="currentColor" />
                              </svg>
                          </a>
                      </div>
                  </div>
              </div>
          </div>
    </footer>
  )
}

export default Footer