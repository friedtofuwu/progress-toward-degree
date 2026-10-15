import React from 'react';
import ReactPaginate from 'react-paginate';
import './../../css/Pagination.css'

const PaginationComponent = ({ pageCount, onPageChange, currentPage }) => {
    const handlePageChange = (selected) => {
        onPageChange && onPageChange({ selected: selected.selected });
    };
    return (
        <ReactPaginate
            pageCount={pageCount}
            pageRangeDisplayed={3}
            marginPagesDisplayed={1}
            onPageChange={handlePageChange}
            containerClassName={'pagination'}
            subContainerClassName={'pages pagination'}
            activeClassName={'active'}
            previousClassName={'arrow'}
            nextClassName={'arrow'}
            previousLabel={<i className="fas fa-chevron-left"></i>}  // Blue left arrow
            nextLabel={<i className="fas fa-chevron-right"></i>}    // Blue right arrow
            breakLabel={'...'}
            breakClassName={'break-me'}
            pageClassName={'page-item'}
            pageLinkClassName={'page-link'}
            previousLinkClassName={'page-link'}
            nextLinkClassName={'page-link'}
            forcePage={currentPage}
        />
    );
};


export default PaginationComponent;
