import React, { useEffect, useState } from 'react'
import { headerStyles } from '../assets/dummyStyles'
import logo from '../assets/logo.png'

const Header = ({ onSearch = () => { } }) => {

    const [menuOpen, setMenuOpen] = useState(false);
    const [q, setQ] = useState("");

    // Load Eczar font (Google Fonts) once
    useEffect(() => {
        const id = 'eczar-google-font';
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Eczar:wght@600;700&display=swap';
        document.head.appendChild(link);
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        onSearch(q.trim());
    };


    return (
        <header className={headerStyles.container}>
            <div className={headerStyles.innerContainer}>
                <div className={headerStyles.mainWrapper}>
                    <div className={headerStyles.logoContainer}>
                        <div className={headerStyles.logoImage}>
                            <img src={logo} alt="Logo" className={headerStyles.logoImg} />
                        </div>

                        <div className={headerStyles.logoText}>
                            <div className={headerStyles.logoTitle}
                                style={{
                                    fontFamily: "'Eczar', serif",
                                }}
                            >
                                Cricket Fever
                            </div>
                        </div>
                    </div>

                    {/* CENTER */}
                    <form onSubmit={handleSearch} className={headerStyles.searchForm} role="search">
                        <div className={headerStyles.searchWrapper}>
                            <label htmlFor='header-search' className='sr-only'>
                                Search Match
                            </label>
                            <div className='relative'>
                                <input id="header-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder='Search' className={headerStyles.searchInput} />
                                <button type='submit' className={headerStyles.searchButton}>Search</button>
                            </div>
                        </div>
                    </form>

                    {/* RIGHT SIDE */}
                    <div className={headerStyles.navContainer}>
                        <nav className='flex items-center gap-2'>
                            <button className={headerStyles.navButtons}>Live</button>
                            <button className={headerStyles.navButtons}>Fixtures</button>
                            <button className={headerStyles.navButtons}>Teams</button>
                        </nav>

                        <div className={headerStyles.authContainer}>
                            <button className={headerStyles.loginButton}>Log in</button>
                            <button className={headerStyles.signupButton}>Sign up</button>
                        </div>
                    </div>

                    {/* MOBILE VIEW */}
                    <div className={headerStyles.mobileMenuButton}>
                        <button
                            aria-expanded={menuOpen}
                            aria-label="Open menu"
                            onClick={() => setMenuOpen((s) => !s)}
                            className={headerStyles.menuToggleButton}
                        >
                            <svg className={headerStyles.menuIcon} viewBox="0 0 24 24" fill="none" aria-hidden>
                                {menuOpen ? (
                                    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                ) : (
                                    <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                )}
                            </svg>
                        </button>

                        {menuOpen && (
                            <div className={headerStyles.mobileMenu}>
                                <nav className={headerStyles.mobileNav}>
                                    <button className={headerStyles.mobileNavButton}>Live</button>
                                    <button className={headerStyles.mobileNavButton}>Fixtures</button>
                                    <button className={headerStyles.mobileNavButton}>Teams</button>
                                </nav>

                                <div className={headerStyles.mobileAuthContainer}>
                                    <button className={`${headerStyles.mobileAuthButton} ${headerStyles.mobileLogin}`}>
                                        Login
                                    </button>
                                    <button className={`${headerStyles.mobileAuthButton} ${headerStyles.mobileSignup}`}>
                                        Sign up
                                    </button>
                                </div>
                                </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;