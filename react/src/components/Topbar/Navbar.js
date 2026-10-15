import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../../css/Navbar.scss';

import { PiListBold } from "react-icons/pi";
import { MenuItems } from './MenuItems';

export default function Navbar({ user }) {
  const dropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);
  const faDropdownRef = useRef(null);
  const auditDropdownRef = useRef(null);

  const [dropdown, setDropdown] = useState(false);
  const [mobileDropdown, setMobileDropdown] = useState(false);
  const [faDropdown, setFADropdown] = useState(false);
  const [auditDropdown, setAuditDropdown] = useState(false);

  const mobileDisplayedItem = MenuItems[user ? 1 : 0];

  const handleClickOutside = (e) => {
    //if (dropdown && dropdownRef.current && !dropdownRef.current.contains(e.target)) {
    //  setDropdown(false);
    //}
    if (mobileDropdown && mobileDropdownRef.current && !mobileDropdownRef.current.contains(e.target)) {
      setMobileDropdown(false);
    }
    //if (faDropdown && faDropdownRef.current && !faDropdownRef.current.contains(e.target)) {
    //  setFADropdown(false);
    //}
    //if (auditDropdown && auditDropdownRef.current && !auditDropdownRef.current.contains(e.target)) {
    //  setAuditDropdown(false);
    //}
  };

  const isLoggedIn = () => !!user;
  const isAdmin = () => ((user?.permissions & 2) === 2);
  const isAdvisor = () => ((user?.permissions & 1) === 1);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdown, mobileDropdown, faDropdown, auditDropdown]);

  return (
    <>
      <nav className='navbar'>
        <Link to='/' className='navbar-title'>
          SAACS
        </Link>

        {/*<ul className='nav-menu desktop-only'>
          <li className='nav-item'>
            <Link to='/' className='nav-links'>Home</Link>
          </li>

          {isLoggedIn() && !isAdvisor() && ( // Student ForceAdd
            <li
              className='nav-item'
              onClick={() => setFADropdown(!faDropdown)}
              ref={faDropdownRef}
            >
              <div className='nav-links'>
                Force Add <i className='fas fa-caret-down' />
              </div>
              {faDropdown && (
                <ul className='nav-fa-dropdown-listB desktop-only'>
                  <fieldset>
                    <legend style={{ color: "white" }}>Undergraduate</legend>
                    <li className='nav-item'>
                      <Link to='/ug/forms/forceadd' className='nav-links'>New ForceAdd</Link>
                    </li>
                    <li className='nav-item'>
                      <Link to='/ug/forceadd' className='nav-links'>View ForceAdds</Link>
                    </li>
                  </fieldset>
                  <fieldset>
                    <legend style={{ color: "white" }}>Graduate</legend>
                    <li className='nav-item'>
                      <Link to='/grad/forms/forceadd' className='nav-links'>New ForceAdd</Link>
                    </li>
                    <li className='nav-item'>
                      <Link to='/grad/forceadd' className='nav-links'>View ForceAdds</Link>
                    </li>
                  </fieldset>
                </ul>
              )}
            </li>
          )}

          {isLoggedIn() && isAdvisor() && ( // Advisor ForceAdd
            <li
              className='nav-item'
              onClick={() => setFADropdown(!faDropdown)}
              ref={faDropdownRef}
            >
              <div className='nav-links'>
                Force Add <i className='fas fa-caret-down' />
              </div>
              {faDropdown && (
                <ul className='nav-fa-dropdown-listA desktop-only'>
                  <fieldset>
                    <legend style={{ color: "white" }}>Undergraduate</legend>
                    <li className='nav-item'>
                      <Link to='/ug/forms/forceadd' className='nav-links'>New ForceAdd</Link>
                    </li>
                    <li className='nav-item'>
                      <Link to='/ug/forceadd' className='nav-links'>View ForceAdds</Link>
                    </li>
                    {isAdmin() && isAdvisor() && (
                      <li className='nav-item'>
                        <Link to='/ug/forceaddmin' className='nav-links'>ForceAddmin</Link>
                      </li>
                    )}
                  </fieldset>
                  <fieldset>
                    <legend style={{ color: "white" }}>Graduate</legend>
                    <li className='nav-item'>
                      <Link to='/grad/forms/forceadd' className='nav-links'>New ForceAdd</Link>
                    </li>
                    <li className='nav-item'>
                      <Link to='/grad/forceadd' className='nav-links'>View ForceAdds</Link>
                    </li>
                    {isAdmin() && isAdvisor() && (
                      <li className='nav-item'>
                        <Link to='/grad/forceaddmin' className='nav-links'>ForceAddmin</Link>
                      </li>
                    )}
                  </fieldset>
                </ul>
              )}
            </li>
          )}

          {isAdvisor() && ( // Audit
            <li
              className='nav-item'
              onClick={() => setAuditDropdown(!auditDropdown)}
              ref={auditDropdownRef}
            >
              <div className='nav-links'>
                Audit <i className='fas fa-caret-down' />
              </div>
              {auditDropdown && (
                <ul className='nav-audit-dropdown-list desktop-only'>
                  <li className='nav-item'>
                    <Link to='/audits' className='nav-links'>Audits</Link>
                  </li>
                  <li className='nav-item'>
                    <Link to='/checksheet' className='nav-links'>Checksheet</Link>
                  </li>
                </ul>
              )}
            </li>
          )}

          {isAdmin() && (
            <li className='nav-item'>
              <Link to='/admin' className='nav-links'>Admin</Link>
            </li>
          )}

          <li
            className='nav-item'
            onClick={() => setDropdown(!dropdown)}
            ref={dropdownRef}
          >
            <div className='nav-links'>
              Account <i className='fas fa-caret-down' />
            </div>
            {dropdown && (
              <ul className='nav-dropdown-list desktop-only'>
                <li className='nav-item'>
                  <a className='nav-links' href={mobileDisplayedItem.path}>
                    {mobileDisplayedItem.title}
                  </a>
                </li>
              </ul>
            )}
          </li>
        </ul>*/}

        <span
          className={`mobile-dropdown-icon${mobileDropdown ? ' expanded' : ''}`}
          title='Navigation menu'
          ref={mobileDropdownRef}
        >
          <PiListBold onClick={() => setMobileDropdown(!mobileDropdown)} />
          {mobileDropdown && (
            <ul className='nav-dropdown-list mobile-only'>
              {false && isLoggedIn() && (
                <fieldset>
                  <legend style={{ color: "white" }}>Undergraduate ForceAdds</legend>
                  <li className='nav-item'>
                    <Link to='/ug/forms/forceadd' className='nav-links'>New ForceAdd</Link>
                  </li>
                  <li className='nav-item'>
                    <Link to='/ug/forceadd' className='nav-links'>View ForceAdds</Link>
                  </li>
                  {isAdmin() && isAdvisor() && (
                    <li className='nav-item'>
                      <Link to='/ug/forceaddmin' className='nav-links'>ForceAddmin</Link>
                    </li>
                  )}
                </fieldset>
              )}

              {false && isLoggedIn() && (
                <fieldset>
                  <legend style={{ color: "white" }}>Graduate ForceAdds</legend>
                  <li className='nav-item'>
                    <Link to='/grad/forms/forceadd' className='nav-links'>New ForceAdd</Link>
                  </li>
                  <li className='nav-item'>
                    <Link to='/grad/forceadd' className='nav-links'>View ForceAdds</Link>
                  </li>
                  {isAdmin() && isAdvisor() && (
                    <li className='nav-item'>
                      <Link to='/grad/forceaddmin' className='nav-links'>ForceAddmin</Link>
                    </li>
                  )}
                </fieldset>
              )}

              {isAdvisor() && (
                <fieldset>
                  <legend style={{ color: "white" }}>Audits</legend>
                  <li className='nav-item'>
                    <Link to='/audits' className='nav-links'>Audits</Link>
                  </li>
                  <li className='nav-item'>
                    <Link to='/checksheet' className='nav-links'>Checksheet</Link>
                  </li>
                </fieldset>
              )}

              {isAdmin() && (
                <li className='nav-item'>
                  <Link to='/admin' className='nav-links'>Admin</Link>
                </li>
              )}

              <li className='nav-item'>
                <a className='nav-links' href={mobileDisplayedItem.path}>
                  {mobileDisplayedItem.title}
                </a>
              </li>
            </ul>
          )}
        </span>
      </nav>
    </>
  );
}
