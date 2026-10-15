import React from 'react';

const SearchBarComponent = ({ searchInput, onSearchChange, onSearch, onClearSearch, onKeyPress }) => {
  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Search"
        value={searchInput}
        onChange={onSearchChange}
        onKeyDown={onKeyPress}
      />
      <button onClick={onSearch}>Search</button>
      <button onClick={onClearSearch}>Clear</button>
    </div>
  );
};

export default SearchBarComponent;