import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false); // State to manage dropdown toggle

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) {
        setIsOpen(false); // Automatically close the dropdown when screen is resized to wide dimensions
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleOnClick = () => {
    navigate("/Spatial");
  };

  if (location.pathname !== "/") {
    return null;
  }

  return (
    <nav className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2 w-full bg-stone-950 text-white relative">
      <div className="text-xl sm:text-2xl font-bold">
        <a href="/" className="hover:text-red-500">
          Shadow
        </a>
      </div>
      <div className="sm:hidden">
        <button onClick={() => setIsOpen(!isOpen)} className="text-white focus:outline-none">
          <svg className="h-6 w-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            {isOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16m-7 6h7" />
            )}
          </svg>
        </button>
      </div>
      {/* Dropdown menu for small screens */}
      <ul className={`${isOpen ? "flex" : "hidden"} flex-col items-start space-y-2 p-4 rounded-lg shadow-lg bg-black absolute top-full right-0 mt-2 w-auto sm:w-64 z-50`}>
        <li>
          <a href="/" className="hover:text-gray-400" onClick={() => setIsOpen(false)}>
            Home
          </a>
        </li>
        <li>
          <a href="https://github.com/Varun-2538/Shadow" className="hover:text-gray-400" onClick={() => setIsOpen(false)}>
            Github
          </a>
        </li>
        <li>
          <a href="#" className="hover:text-gray-400" onClick={() => setIsOpen(false)}>
            FAQs
          </a>
        </li>
        <li>
          <a href="#" className="hover:text-gray-400" onClick={() => setIsOpen(false)}>
            About Us
          </a>
        </li>
      </ul>
      {/* Normal navigation and login button for medium and larger screens */}
      <div className="hidden sm:flex space-x-4 sm:space-x-6 md:space-x-8 lg:space-x-12 items-center">
        <a href="/" className="text-white hover:text-gray-400">Home</a>
        <a href="https://github.com/Varun-2538/Shadow" className="text-white hover:text-gray-400">Github</a>
        <a href="#" className="text-white hover:text-gray-400">FAQs</a>
        <a href="#" className="text-white hover:text-gray-400">About Us</a>
        <button
          onClick={handleOnClick}
          className="px-4 py-2 bg-white text-gray-900 rounded-md hover:bg-gray-200"
        >
          Login
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
