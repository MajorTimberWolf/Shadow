import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";

const StyledSidebar = styled.div`
  min-height: 100vh;
  width: 240px;
  background: #0f172a;
  padding: 16px;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
`;

const StyledButton = styled.button`
  width: 100%;
  text-align: center;
  padding: 10px 16px;
  border-radius: 5px;
  transition: all 0.2s;
  background-color: ${(props) => (props.open ? "#4b5563" : "transparent")};
  color: #f5f5f4;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
`;

const StyledLink = styled.a`
  position: relative;
  padding: 10px 15px;
  border-radius: 5px;
  transition: transform 0.5s, background-color 0.2s;
  color: #f5f5f4; // Bright cyan color for text
  display: block;
  text-decoration: none;

  &:hover {
    background-color: #4b5563; // Tailwind gray-700
  }
`;

const Sidebar = () => {
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (location.pathname === "/") {
    return null;
  }

  return (
    <StyledSidebar>
      <nav>
        <div className="text-3xl pt-1 ml-4 pl-4 mb-8  text-white  font-bold font-serif">
          Shadow
        </div>
        <div className="text-white ml-4 mt-4 pt-4 font-semibold flex flex-col justify-center space-y-4">
          <div>
            <StyledButton
              onClick={() => setDropdownOpen(dropdownOpen)}
              open={dropdownOpen}
            >
              Analysis
            </StyledButton>
            <div className="flex flex-col pl-4 space-y-2">
              <StyledLink href="/Spatial"> &gt; Spatial</StyledLink>
              <StyledLink href="/beatwise">&gt; Beatwise</StyledLink>
              <StyledLink href="/temporal">&gt; Temporal</StyledLink>
            </div>
          </div>
          {/* <StyledLink href="/Deployment">Deployment</StyledLink> */}
          <StyledLink href="/Prediction">Prediction & Deployment Plan</StyledLink>
          <StyledLink href="/map">Data Entry</StyledLink>
        </div>
      </nav>
    </StyledSidebar>
  );
};

export default Sidebar;
