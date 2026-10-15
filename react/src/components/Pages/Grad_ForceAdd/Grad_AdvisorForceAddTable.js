import React, {useState, useEffect} from "react";
import axios from "axios";
import { statusIsGood } from "../../../helpers/http";
import { Link, useParams } from "react-router-dom";
import PaginationComponent from "../Pagination";
import "../../../css/TableShrink.css";
import "../../../css/AdvisorForceAddTable.css";

export default function Grad_AdvisorForceAddTable() {
    const [isLoaded, setIsLoaded] = useState(false);
    const [forceAdds, setForceAdds] = useState([]);
    const [terms, setTerms] = useState([]);

    const [forceAddPage, setForceAddPage] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [perPage, setPerPage] = useState(10);
    const [defaults, setDefaults] = useState({});
    const params = new URLSearchParams(window.location.search);

    const setSelectDefaults = () => {
        let d = {};
        if(params.has("term"))
            d.term = params.getAll("term");
        else
            d.term = ["Any"];
        if(params.has("status"))
            d.status = params.getAll("status");
        else
            d.status = ["0"]; //Default to pending rather than any
        if(params.has("degree"))
            d.degree = params.getAll("degree");
        else
            d.degree = ["Any"];
        if(params.has("major"))
            d.major = params.getAll("major");
        else
            d.major = ["Any"];
        if(params.has("campus"))
            d.campus = params.getAll("campus");
        else
            d.campus = ["Any"];
        if(params.has("pid"))
            d.pid = params.get("pid");
        if(params.has("course_id"))
            d.course_id = params.get("course_id");
        if(params.has("crn"))
            d.crn = params.get("crn");
        if(params.has("name"))
            d.name = params.get("name");
        if(params.has("sort1"))
            d.sort1 = params.get("sort1");
        else
            d.sort1 = "submission_timestamp";
        if(params.has("sort2"))
            d.sort2 = params.get("sort2");
        else
            d.sort2 = "Any";
        if(params.has("sortdir"))
            d.sortdir = params.get("sortdir");
        else
            d.sortdir = "ASC";
        if(params.has("perpage"))
            d.perpage = parseInt(params.get("perpage"));
        else
            d.perpage = 10;
        if(params.has("page"))
            d.page = parseInt(params.get("page"));
        else
            d.page = 0;
        setDefaults(d);
    }

    // Fetch the users forceadds
    const fetchForceAdds = async() => {
        //Handle defaults
        let d = [];
        if(!params.has("sort1")) {
            d.push("sort1=submission_timestamp");
        }
        if(!params.has("sort2")) {
            d.push("sort2=submission_timestamp");
        }
        if(!params.has("sortdir")) {
            d.push("sortdir=ASC");
        }
        if(!params.has("status")) {
            d.push("status=0");
        }
        try {
            axios.get(
                "/api/grad/forceadd?"+[params.toString(),...d].join("&")
            ).then((response) => {
                const forceAddData = response.data.forceadds || [];
                setForceAdds(forceAddData);
            })
        } catch (error) {
            console.error("Error getting forceAdds: ", error);
        }
    }

    const formSearch = (includePage) => {
        let q = [];
        //Handle multiple select options
        let o = document.getElementById("term-filter").options;
        for(let i=0; i < o.length; i++) {
            if(o[i].selected && o[i].value != "Any") {
                q.push(`term=${o[i].value}`)
            }
        }
        o = document.getElementById("status-filter").options;
        for(let i=0; i < o.length; i++) {
            if(o[i].selected && o[i].value != "Any") {
                q.push(`status=${o[i].value}`)
            }
        }
        o = document.getElementById("degree-filter").options;
        for(let i=0; i < o.length; i++) {
            if(o[i].selected && o[i].value != "Any") {
                q.push(`degree=${o[i].value}`)
            }
        }
        o = document.getElementById("major-filter").options;
        for(let i=0; i < o.length; i++) {
            if(o[i].selected && o[i].value != "Any") {
                q.push(`major=${o[i].value}`)
            }
        }
        o = document.getElementById("campus-filter").options;
        for(let i=0; i < o.length; i++) {
            if(o[i].selected && o[i].value != "Any") {
                q.push(`campus=${o[i].value}`)
            }
        }
        //Handle String Inputs
        o = document.getElementById("pid");
        if(o.value != "")
            q.push(`pid=${o.value}`)
        
        o = document.getElementById("course_id");
        if(o.value != "")
            q.push(`course_id=${o.value}`)
        
        o = document.getElementById("crn");
        if(o.value != "")
            q.push(`crn=${o.value}`)
        
        o = document.getElementById("name");
        if(o.value != "")
            q.push(`name=${o.value}`)
        
        //Handle Sort and Paging
        o = document.getElementById("sort1");
        if(o.value != "Any")
            q.push(`sort1=${o.value}`)
        
        o = document.getElementById("sort2");
        if(o.value != "Any")
            q.push(`sort2=${o.value}`)
        
        o = document.getElementById("sort-direction");
        if(o.value != "Any")
            q.push(`sortdir=${o.value}`);
        
        o = document.getElementById("perpage");
        if(o.value != "Any")
            q.push(`perpage=${o.value}`);

        if(includePage) {
            q.push(`page=${currentPage}`);
        }
        //Relocate to the updated search page
        return "/grad/forceadd?"+q.join("&");
    }

    const handleSearch = () => {
        let w = formSearch(false);
        console.log(w);
        window.history.pushState(window.history.state,'',w);
        try {
            axios.get(
                "/api"+w
            ).then((response) => {
                const forceAddData = response.data.forceadds || [];
                setForceAdds(forceAddData);
            })
        } catch (error) {
            console.error("Error getting forceAdds: ", error);
        }
        setPerPage(parseInt(document.getElementById("perpage").value));
    }

    const viewRequest = (requestID) => {
        //Add the current search along with the page to history
        window.history.pushState(window.history.state,'',formSearch(true))
        window.location.href = '/grad/forceadd/'+requestID;
    }

    // Fetch the terms
    const fetchTerms = async() => {
        try {
            axios.get("/api/grad/term").then((response) => {
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
                `/api/grad/forceadd/${forceadd_id}`
            ).then(() => {
                fetchForceAdds();
            }).catch((error) => {
                console.error(error);
                alert("Failed to cancel force add request. Please try again later.")
            })
        } catch(error) {
            alert("Failed to cancel force add request. Please try again later.")
        }
    } 

    function handleForceAddsCSV() {
        //Handle defaults
        let defaults = [];
        if(!params.has("sort1")) {
            defaults.push("sort1=submission_timestamp");
        }
        if(!params.has("sortdir")) {
            defaults.push("sortdir=ASC");
        }
        axios.get('/api/grad/forceadds/csv?'+[params.toString(),...defaults].join("&"), {
            responseType: 'blob'
        }).then((response) => {
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const date = new Date();
            const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
            link.setAttribute('download', `forceadds-${dateString}.csv`);
            document.body.appendChild(link);
            link.click();
        }).catch((error) => {
            if(error.response) {
                alert(`Error downloading forceadds${error.response?.data?.message
                    ? ': ' + error.response.data.message + '.'
                    : '. Please try again.'}`);
            } else if (error.request) {
                console.error('Got no response to request:', error.request);
                alert('Error downloading forceadds. Please try again.');
            } else {
                console.error('Error:', error.message)
                alert('Error downloading forceadds. Please try again.');
            }
        })
    }

    const handlePageChange = ({ selected }) => {
        const newPage = parseInt(selected);
        setCurrentPage(newPage);
        pageSections(newPage);
    }

    const pageSections = (page) => {
        const offset = parseInt(page * perPage);
        setForceAddPage(forceAdds.slice(offset, offset+parseInt(perPage)));
    }

    useEffect(() => {
        if(isLoaded) {
            setCurrentPage(0);
            pageSections(0);
        }
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
        setSelectDefaults(); // Set the defaults for all the selects
        //fetchForceAdds(); // Get the forceAdds for the table
        fetchTerms(); // Get the terms for filtering
        //setIsLoaded(true); // Load the page
    }, [])

    useEffect(() => {
        fetchForceAdds();
    }, [terms])
    useEffect(() => {
        if(isLoaded) {
            setCurrentPage(0);
            pageSections(0);
        } else {
            console.log(JSON.stringify(defaults));
            setPerPage(parseInt(defaults.perpage));
            setCurrentPage(parseInt(defaults.page));
            pageSections(parseInt(defaults.page));
            setIsLoaded(true);
        }
    }, [forceAdds])

    //Need to manually add options to set intial value for some reason
    useEffect(() => {
        if(isLoaded && terms.length > 0) {
            let s = document.getElementById("term-filter");
            terms.forEach(term => {
                let o = document.createElement("option");
                o.value = term.termcode;
                o.text = readableTerm(term.termcode);
                o.selected = String(term.termcode) in defaults["term"];
                s.add(o);
            })
            s.value = defaults["term"];
        }
    },[terms,isLoaded])
    
    return (
        <div className="page-body">
            {isLoaded && (<>
                <h1>Force Add Submissions</h1>
                <form className="table-options" action="/grad/forceadd" method="get">
                    <div className="fa-table-filter">
                        <label for="term-filter">Term:</label>
                        <select
                            id="term-filter"
                            class="form-select"
                            defaultValue={defaults["term"]}
                            multiple
                            size={5}
                        >
                            <option value="Any">Any</option>
                        </select>
                    </div>
                    <div className="fa-table-filter">
                        <label for="status-filter">Status:</label>
                        <select
                            id="status-filter"
                            class="form-select"
                            defaultValue={defaults["status"]}
                            multiple
                            size={5}
                        >
                            <option value="Any">Any</option>
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
                        <label for="degree-filter">Degree:</label>
                        <select
                            id="degree-filter"
                            class="form-select"
                            defaultValue={defaults["degree"]}
                            multiple
                            size={5}
                        >
                            <option value="Any">Any</option>
                            <option value="BS">Bachelor of Science (BS)</option>
                            <option value="BM">Accelerated BS/MS or MEng (4+1)</option>
                            <option value="MS">Master of Science (MS)</option>
                            <option value="MEng">Master of Engineering (MEng)</option>
                            <option value="PhD">Doctor of Philosophy (PhD)</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className="fa-table-filter">
                        <label for="major-filter">Major:</label>
                        <select
                            id="major-filter"
                            class="form-select"
                            defaultValue={defaults["major"]}
                            multiple
                            size={5}
                        >
                            <option value="Any">Any</option>
                            <option value="CS">Computer Science</option>
                            <option value="DCC">Data Centric Computing</option>
                            <option value="SC">Secure Computing</option>
                            <option value="CSA">Computer Science & Applications</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className="fa-table-filter">
                        <label for="campus-filter">Campus:</label>
                        <select
                            id="campus-filter"
                            class="form-select"
                            defaultValue={defaults["campus"]}
                            multiple
                            size={5}
                        >
                            <option value="Any">Any</option>
                            <option value={0}>Blacksburg</option>
                            <option value={4}>National Capital Region</option>
                            <option value={10}>Virtual</option>
                        </select>
                    </div>
                    <div className="fa-table-filter">
                        <label for="pid">PID:</label>
                        <input
                            id="pid"
                            class="form-control"
                            type="text"
                            defaultValue={defaults["pid"]}
                        />
                    </div>
                    <div className="fa-table-filter">
                        <label for="course_id">Course Number:</label>
                        <input
                            id="course_id"
                            class="form-control"
                            type="text"
                            defaultValue={defaults["course_id"]}
                        />
                    </div>
                    <div className="fa-table-filter">
                        <label for="crn">CRN:</label>
                        <input
                            id="crn"
                            class="form-control"
                            type="text"
                            defaultValue={defaults["crn"]}
                        />
                    </div>
                    <div className="fa-table-filter">
                        <label for="name">Name:</label>
                        <input
                            id="name"
                            class="form-control"
                            type="text"
                            defaultValue={defaults["name"]}
                        />
                    </div>
                    <div className="fa-table-filter">
                        <label for="sort1">Primary Sort:</label>
                        <select
                            id="sort1"
                            class="form-select"
                            defaultValue={defaults["sort1"]}
                        >
                            <option value="submission_timestamp">Submission Time</option>
                            <option value="term">Term</option>
                            <option value="status">Status</option>
                            <option value="campus">Campus</option>
                            <option value="academic_level">Academic Level</option>
                            <option value="major">Major</option>
                            <option value="degree">Degree</option>
                            <option value="reason">Reason</option>
                            <option value="course_id">Course</option>
                            <option value="banner_name">Name</option>
                        </select>
                    </div>
                    <div className="fa-table-filter">
                        <label for="sort2">Secondary Sort:</label>
                        <select
                            id="sort2"
                            class="form-select"
                            defaultValue={defaults["sort2"]}
                        >
                            <option value="Any">None</option>
                            <option value="submission_timestamp">Submission Time</option>
                            <option value="term">Term</option>
                            <option value="status">Status</option>
                            <option value="campus">Campus</option>
                            <option value="academic_level">Academic Level</option>
                            <option value="major">Major</option>
                            <option value="degree">Degree</option>
                            <option value="reason">Reason</option>
                            <option value="course_id">Course</option>
                            <option value="banner_name">Name</option>
                        </select>
                    </div>
                    <div className="fa-table-filter">
                        <label for="sort-direction">Sort Direction:</label>
                        <select
                            id="sort-direction"
                            class="form-select"
                            defaultValue={defaults["sortdir"]}
                        >
                            <option value="ASC">Ascending</option>
                            <option value="DESC">Descending</option>
                        </select>
                    </div>
                    <div className="fa-table-filter">
                        <label for="perpage">Per Page:</label>
                        <select
                            id="perpage"
                            class="form-select"
                            //defaultValue={perPage}
                            defaultValue={defaults["perpage"]}
                            onChange={(e) => {
                                setPerPage(parseInt(e.target.value));
                            }}
                        >
                            <option value={2}>2</option>
                            <option value={10}>10</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={999999999999}>All</option>
                        </select>
                    </div>
                    <div className="fa-table-filter">
                        <button type="button" className="btn btn-success" onClick={handleSearch}>Search</button>
                        <button type="button" className="btn btn-warning" onClick={handleForceAddsCSV}>Download ForceAdds</button>
                    </div>
                </form>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Term</th>
                            <th>Course</th>
                            <th>First Choice</th>
                            <th>Second Choice</th>
                            <th>Drop Choices</th>
                            <th>Reason</th>
                            <th>PID</th>
                            <th>ID Number</th>
                            <th>Name</th>
                            <th>Degree</th>
                            <th>Major</th>
                            <th>Campus</th>
                            <th>Graduation Date</th>
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
                                <td>{forceAdd.pid}</td>
                                <td>{forceAdd.id_number}</td>
                                <td>{forceAdd.banner_name}</td>
                                <td>{forceAdd.degree}</td>
                                <td><span class="submission-text">{forceAdd.major}</span> / <span class="banner-text">{forceAdd.banner_major}</span></td>
                                <td><span class="submission-text">{forceAdd.campus == 0 ? "Blacksburg" : forceAdd.campus == 4 ? "National Capital Region": "Virtual"}</span> / <span class="banner-text">{forceAdd.banner_campus}</span></td>
                                <td>{readableTerm(forceAdd.grad_date)}</td>
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
                                    <button
                                        type="button"
                                        className="btn btn-success"
                                        onClick={() => viewRequest(forceAdd.forceadd_id)}
                                    >View</button>
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
                <div id="legend">
                    <p>
                        <span class="submission-text">Submitted</span> / <span class="banner-text">Banner</span>
                    </p>
                </div>
            </>)}
        </div>
    )
}