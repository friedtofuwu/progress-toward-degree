import React, {useState, useEffect} from "react";
import axios from "axios";
import { statusIsGood } from "../../../helpers/http";
import { Link } from "react-router-dom";
import PaginationComponent from "../Pagination";

export default function AdvisorForceAddTable() {
    const [isLoaded, setIsLoaded] = useState(false);
    const [forceAdds, setForceAdds] = useState([]);
    const [terms, setTerms] = useState([]);

    const [forceAddPage, setForceAddPage] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [perPage, setPerPage] = useState(10);

    // Fetch the users forceadds
    const fetchForceAdds = async() => {
        let params = {};
        if(isLoaded) { // Only check settings if settings have loaded
            if(document.getElementById("term-filter").value != 0)
                params.term = document.getElementById("term-filter").value;
            if(document.getElementById("status-filter").value != -1)
                params.status = document.getElementById("status-filter").value;
            params.sort = document.getElementById("sort-by").value;
            params.sortdir = document.getElementById("sort-direction").value;
        } else {
            params.sort = "submission_timestamp";
            params.sortdir = "ASC";
            //params.status = "-1";
        }
        try {
            console.log(JSON.stringify(params));
            axios.get(
                "/api/forceadd",
                {params}
            ).then((response) => {
                const forceAddData = response.data.forceadds || [];
                setForceAdds(forceAddData);
            })
        } catch (error) {
            console.error("Error getting forceAdds: ", error);
        }
    }

    // Fetch the terms
    const fetchTerms = async() => {
        try {
            axios.get("/api/term").then((response) => {
                const termsData = response.data.terms || [];
                setTerms(termsData);
            });
        } catch (error) {
            console.error("Error getting terms: ", error);
        }
    }

    const cancelRequest = (forceadd_id) => {
        if(!window.confirm("Are you sure you would like to cancel this request? Requests are typically reviewed in the order they are submitted, so any future requests will be further down in the queue."))
            return;
        try {
            axios.delete(
                `/api/forceadd/${forceadd_id}`
            ).then(() => {
                fetchForceAdds();
            }).catch((error) => {
                console.log(error);
                alert("Failed to cancel force add request. Please try again later.")
            })
        } catch(error) {
            alert("Failed to cancel force add request. Please try again later.")
        }
    } 

    const handlePageChange = ({ selected }) => {
        const newPage = selected;
        setCurrentPage(newPage);
        pageSections(newPage);
    }

    const pageSections = (page) => {
        const offset = parseInt(page * perPage);
        setForceAddPage(forceAdds.slice(offset, offset+parseInt(perPage)));
    }

    useEffect(() => {
        setCurrentPage(0);
        pageSections(0);
    }, [perPage])

    const readableTimeStamp = (t) => {
        if(typeof(t) == "string") {
            let s = t.split(/[- :T.]/);
            let d = [parseInt(s[1]),parseInt(s[2]),parseInt(s[0])].join("-");
            let h = parseInt(s[3])%12;
            let c = (h > 0 ? h : 12)+":"+s[4]+(s[3] > 12 ? "PM":"AM");
            return c+" "+d;
        } else
            return "12:42PM 6-20-1872"
    }

    const readableTerm = (t) => {
        return (
            (t % 100 == 1) ? "Spring" :
            (t % 100 == 9) ? "Fall" :"Summer"
        ) + ` ${parseInt(t/100)} (${t})`;
    }

    useEffect(() => {
        fetchForceAdds(); // Get the forceAdds for the table
        fetchTerms(); // Get the terms for filtering
        setIsLoaded(true); // Load the page
    }, [])

    // Repage each time forceAdds updates
    useEffect(() => {
        pageSections(0);
        setCurrentPage(0);
    }, [forceAdds])

    return (
        <div className="page-body">
            {isLoaded && (<>
                <Link className="btn btn-success" style={{width:"100px",float:"right"}} to={"/forms/forceadd"}>New Request</Link>
                <h1>Force Add Submissions</h1>
                <div className="table-options">
                    <div className="fa-table-filter">
                        <label for="term-filter">Term:</label>
                        <select
                            id="term-filter"
                            class="form-select"
                            defaultValue={0}
                            onChange={(e) => fetchForceAdds()}
                        >
                            <option value={0}>Any</option>
                            {terms.map((term) => (
                                <option value={term.termcode}>{readableTerm(term.termcode)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="fa-table-filter">
                        <label for="status-filter">Status:</label>
                        <select
                            id="status-filter"
                            class="form-select"
                            defaultValue={-1}
                            onChange={(e) => fetchForceAdds()}
                        >
                            <option value={-1}>Any</option>
                            <option value={0}>Pending Review</option>
                            <option value={1}>Approved</option>
                            <option value={3}>Denied - Other (Resubmission Allowed)</option>
                            <option value={4}>Denied - Other (Resubmission Not Allowed)</option>
                            <option value={5}>Denied - Missing Prerequisite (Resubmission Not Allowed)</option>
                            <option value={6}>Denied - Class Full (Resubmission Not Allowed)</option>
                            <option value={32}>Canceled</option>
                        </select>
                    </div>
                    <div className="fa-table-filter">
                        <label for="sort-by">Sort By:</label>
                        <select
                            id="sort-by"
                            class="form-select"
                            defaultValue={"submission_timestamp	"}
                            onChange={(e) => fetchForceAdds()}
                        >
                            <option value="submission_timestamp">Submission Time</option>
                            <option value="term">Term</option>
                            <option value="status">Status</option>
                            <option value="reason">Reason</option>
                            <option value="course_id">Course</option>
                        </select>
                    </div>
                    <div className="fa-table-filter">
                        <label for="sort-direction">Sort Direction:</label>
                        <select
                            id="sort-direction"
                            class="form-select"
                            defaultValue={"ASC"}
                            onChange={(e) => fetchForceAdds()}
                        >
                            <option value="ASC">Ascending</option>
                            <option value="DESC">Descending</option>
                        </select>
                    </div>
                    <div className="fa-table-filter">
                        <label for="per-page">Submissions/Page</label>
                        <select
                            id="per-page"
                            class="form-select"
                            defaultValue={perPage}
                            onChange={(e) => {
                                setPerPage(parseInt(e.target.value));
                            }}
                        >
                            <option value={2}>2</option>
                            <option value={10}>10</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={forceAdds.length}>All</option>
                        </select>
                    </div>
                </div>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Term</th>
                            <th>Course</th>
                            <th>First Choice</th>
                            <th>Second Choice</th>
                            <th>Drop Choices</th>
                            <th>Reason</th>
                            <th>Time Submitted</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {forceAddPage.map((forceAdd) => (
                            <tr>
                                <td>{readableTerm(forceAdd.term)}</td>
                                <td>{forceAdd.course_id}</td>
                                <td>{forceAdd.first_choice}</td>
                                <td>{forceAdd.second_choice}</td>
                                <td>{forceAdd.drops}</td>
                                <td>{
                                    forceAdd.reason == 0 ? "D3AD B33F" :
                                    forceAdd.reason == 1 ? "You are a current CS/DCC/SC major or CS/HCI minor, AND your major/minor is included in the class restrictions, but you cannot register." :
                                    forceAdd.reason == 2 ? "Graduate student attempting to add an undergraduate course and have received direction from the CS Department to submit this request. Please add details in the comment box." :
                                    forceAdd.reason == 3 ? "You did not earn a C or better in a CS course in the prior semester and need to repeat the course." :
                                    forceAdd.reason == 4 ? "You took an approved alternate course and are approved to override the prerequisite(s) in CS 4824 or CS 3654 (these are the ONLY courses with approved overrides)." :
                                    forceAdd.reason == 5 ? "You want to enroll in CS 3984, 3894, 4894 or 4984, and cannot as these courses require force/adding to enroll." :
                                    forceAdd.reason == 6 ? "Only select this option if you were instructed by your CS major or minor advisor to submit this request. Please include details in the comment box below." :
                                    forceAdd.reason == 13 ? "You have completed an approved alternate prerequisite but cannot register (ex: Took ECE 2514 in place of CS 1114)." :
                                    forceAdd.reason == 7 ? "Prerequisites were completed outside of VT and your student record hasn't been updated." :
                                    forceAdd.reason == 8 ? "The course is restricted by major, but the course is required for your major, minor, degree, or graduate certificate." :
                                    forceAdd.reason == 9 ? "The course is restricted by major, but you are a prospective student or Commonwealth Campus student." :
                                    forceAdd.reason == 10 ? "The course requires department or faculty approval." :
                                    forceAdd.reason == 11 ? "Currently retaking a prerequisite." :
                                    forceAdd.reason == 12 ? "I am an Accelerated MS/MEng 4+1 student." :
                                    "Other"
                                }</td>
                                <td>{readableTimeStamp(forceAdd.submission_timestamp)}</td>
                                <td id={`${forceAdd.forceadd_id}-status`}>{
                                    forceAdd.status == 0 ? "Pending Review" : 
                                    forceAdd.status == 1 ? "Approved" : 
                                    forceAdd.status == 2 ? "Wait Listed" : 
                                    forceAdd.status == 3 ? "Denied - Other (Resubmission Allowed)" :
                                    forceAdd.status == 4 ? "Denied - Other (Resubmission Not Allowed)" :
                                    forceAdd.status == 5 ? "Denied - Missing Prerequisite (Resubmission Not Allowed)" :
                                    forceAdd.status == 6 ? "Denied - Class Full (Resubmission Not Allowed)" :
                                    forceAdd.status == 32 ? "Cancelled" : "D3AD B33F"
                                    } ({readableTimeStamp(forceAdd.status_timestamp)})</td>
                                <td>
                                    <Link
                                        className="btn btn-warning"
                                        to={'/forceadd/'+forceAdd.forceadd_id}
                                    >View</Link>
                                    <button
                                        type="button"
                                        className="btn btn-danger"
                                        onClick={() => cancelRequest(forceAdd.forceadd_id)}
                                        disabled={forceAdd.status !== 0}
                                    >
                                        Cancel
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <PaginationComponent
                    pageCount={Math.ceil(forceAdds.length / parseInt(perPage))}
                    onPageChange={handlePageChange}
                    currentPage={currentPage}
                />
            </>)}
        </div>
    )
}