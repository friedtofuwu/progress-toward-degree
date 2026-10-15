import React, {useState, useEffect} from "react";
import axios from 'axios';
import PaginationComponent from "../Pagination";
import { statusIsGood } from "../../../helpers/http";
import { IoFilterOutline } from "react-icons/io5";

export default function UG_AdminTermTable({ term, changeDates, dropTerm }) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [sections, setSections] = useState([]);
    const [sortedSections, setSortedSections] = useState([]);
    const [sectionsPage, setSectionsPage] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [oldPage, setOldPage] = useState(0);
    const [sectionsPerPage, setSectionsPerPage] = useState(10);
    //const sectionsPerPage = 10;
    
    useEffect(() => {
        try {
            axios.get(`/api/ug/timetable/term/${term.termcode}`)
            .then((response) => {
                const sectionsData = response.data.sections || [];
                setSections(sectionsData);
                setSortedSections(sectionsData);
            }).then(() => {
                pageSections(currentPage);
                //setSectionsPage(sections.slice(0,10));
            }).then(() => {
                setIsLoaded(true);
            })
        } catch (error) {
            console.error('Error getting sections: ',error);
        }
    }, []);
    //Update sorts when changes made to sections
    useEffect(() => {
        if(isLoaded) {
            sortSections(
                document.getElementById(term.termcode+"SortBy")?.value || "crn",
                {
                    active: document.getElementById(term.termcode+"ActiveFilter")?.value || 0,
                    campus: document.getElementById(term.termcode+"CampusFilter")?.value || -1,
                    enrollment: document.getElementById(term.termcode+"EnrollmentFilter")?.value || 0,
                    grad: document.getElementById(term.termcode+"GradFilter")?.value || 0,
                }
            )
        }
    }, [sections])

    //Update the sectionPage to match any changes to the sections
    useEffect(() => {
        pageSections(currentPage);
    }, [sortedSections])

    useEffect(() => {
        setCurrentPage(0);
        pageSections(0);
    }, [sectionsPerPage])

    const pageSections = (page) => {
        const offset = page * sectionsPerPage;
        setSectionsPage(sortedSections.slice(offset, offset+sectionsPerPage));
    }

    const handlePageChange = ({ selected }) => {
        const newPage = selected;
        setCurrentPage(newPage);
        pageSections(newPage);
    };

    const setCRNState = async( crn, state ) => {
        axios.post(
            "/api/ug/classes/state",
            {
                termcode: term.termcode,
                crn: crn,
                state: state
            }
        ).then((response) => {
            if(statusIsGood(response.status)) {
                setOldPage(currentPage);
                console.log(`SUCCESSFULLY set ${crn} to ${state}`)
                setCRNStateHelper(crn, state)
            }
            else
                console.error(`FAILED to set ${crn} to ${state}`)
        })
    }

    const setCRNStateHelper = (crn, state) => {
        let newSections = [];
        sections.forEach((s) => {
            if(s.crn == crn) {
                newSections.push({
                    termcode : s.termcode,
                    crn : s.crn,
                    course_id : s.course_id,
                    course_name : s.course_name,
                    credit_hrs : s.credit_hrs,
                    instructor : s.instructor,
                    meet_days : s.meet_days,
                    begin_time : s.begin_time,
                    end_time : s.end_time,
                    location : s.location,
                    campus : s.campus,
                    current_enrollment : s.current_enrollment,
                    max_enrollment : s.max_enrollment,
                    active : state,
                    ignore_enrollment: s.ignore_enrollment
                })
            } else {
                newSections.push({
                    termcode : s.termcode,
                    crn : s.crn,
                    course_id : s.course_id,
                    course_name : s.course_name,
                    credit_hrs : s.credit_hrs,
                    instructor : s.instructor,
                    meet_days : s.meet_days,
                    begin_time : s.begin_time,
                    end_time : s.end_time,
                    location : s.location,
                    campus : s.campus,
                    current_enrollment : s.current_enrollment,
                    max_enrollment : s.max_enrollment,
                    active : s.active,
                    ignore_enrollment: s.ignore_enrollment
                })
            }
        })
        setSections(newSections);
        console.log(`Set state for ${crn}`);
    }

    const setCRNIgnore = async( crn, ignore ) => {
        axios.post(
            "/api/ug/classes/ignore",
            {
                termcode: term.termcode,
                crn: crn,
                ignore: ignore
            }
        ).then((response) => {
            if(statusIsGood(response.status)) {
                console.log(`SUCCESSFULLY set ${crn} to ${ignore}`)
                setOldPage(currentPage);
                setCRNIgnoreHelper(crn, ignore)
            }
            else
                console.error(`FAILED to set ${crn} to ${ignore}`)
        })
    }

    const setCRNIgnoreHelper = (crn, ignore) => {
        let newSections = [];
        sections.forEach((s) => {
            if(s.crn == crn) {
                newSections.push({
                    termcode : s.termcode,
                    crn : s.crn,
                    course_id : s.course_id,
                    course_name : s.course_name,
                    credit_hrs : s.credit_hrs,
                    instructor : s.instructor,
                    meet_days : s.meet_days,
                    begin_time : s.begin_time,
                    end_time : s.end_time,
                    location : s.location,
                    campus : s.campus,
                    current_enrollment : s.current_enrollment,
                    max_enrollment : s.max_enrollment,
                    active : s.active,
                    ignore_enrollment: ignore
                })
            } else {
                newSections.push({
                    termcode : s.termcode,
                    crn : s.crn,
                    course_id : s.course_id,
                    course_name : s.course_name,
                    credit_hrs : s.credit_hrs,
                    instructor : s.instructor,
                    meet_days : s.meet_days,
                    begin_time : s.begin_time,
                    end_time : s.end_time,
                    location : s.location,
                    campus : s.campus,
                    current_enrollment : s.current_enrollment,
                    max_enrollment : s.max_enrollment,
                    active : s.active,
                    ignore_enrollment: s.ignore_enrollment
                })
            }
        })
        setSections(newSections);
        console.log(`Set ignore for ${crn}`);
    }

   /**
    * 
    * @param {string} sortBy column to sort by
    * @param {object} filter object of potential filters:
    *       active -> -1 = inactive, 0 = both, 1 = active;
    *       campus -> -1 = any, 0 = Blacksburg, 4 = National Capital Region, 10 = Virtual;
    *       enrollment -> -1 = full, 0 = any, 1 = has space;
    *       grad -> 0 = any, 1 = undergrad, 2 = graduate
    */
    const sortSections = (sortBy, filter) => {
        console.log(sortBy);
        console.log(filter);
        let activeFilter = parseInt(filter.active);
        let campusFilter = parseInt(filter.campus);
        let enrollmentFilter = parseInt(filter.enrollment);
        let gradFilter = parseInt(filter.grad)
        //Filter
        let newSections = [];
        sections.forEach((s) => {
            // Active
            if(activeFilter == -1 && s.active !== 0) { //inactive only
                return;
            } else if(activeFilter == 1 && s.active !== 1) { //active only
                return;
            }
            // Campus
            if(campusFilter !== -1 && campusFilter !== s.campus) { //Specific Campus
                return;
            }
            // Enrollment
            if(enrollmentFilter == -1 && s.current_enrollment < s.max_enrollment) {//Full
                return;
            } else if(enrollmentFilter == 1 && s.current_enrollment >= s.max_enrollment) {//Space
                return;
            }
            // Grad vs Undergrad
            if(gradFilter == 1 && parseInt(s.course_id.toString().slice(-4)) < 5000) {
                return;
            } else if(gradFilter == 2 && parseInt(s.course_id.toString().slice(-4)) >= 5000) {
                return;
            }
            // Actual filtering
            newSections.push({
                termcode : s.termcode,
                crn : s.crn,
                course_id : s.course_id,
                course_name : s.course_name,
                credit_hrs : s.credit_hrs,
                instructor : s.instructor,
                meet_days : s.meet_days,
                begin_time : s.begin_time,
                end_time : s.end_time,
                location : s.location,
                campus : s.campus,
                current_enrollment : s.current_enrollment,
                max_enrollment : s.max_enrollment,
                active : s.active,
                ignore_enrollment: s.ignore_enrollment
            });
        })
        //Sort
        newSections.sort(function(a,b){
            if(sortBy == "course_name") { //String comparison
                if(a.course_name > b.course_name)
                    return 1;
                else if(a.course_name < b.course_name)
                    return -1;
                return 0;
            } else if(sortBy == "course_id") {
                if(a.course_id > b.course_id)
                    return 1;
                else if(a.course_id < b.course_id)
                    return -1;
                return 0;
            }
            return a[sortBy] - b[sortBy];
        });
        if(oldPage > 0) { //Don't lose track if activating or ignoring
            setCurrentPage(oldPage);
        } else {
            setCurrentPage(0); //Reset Paging
        }
        setSortedSections(newSections); //Set new filtered and sorted sections
    }

    useEffect(() => {
        setOldPage(0)
    }, [currentPage])

    return (
        <>
        {isLoaded && (
    <div id={term.termcode+"-div"}>
        <div className="term-header term-header-open">
            <h3 className="term-title">
                { /* Semester */
                    (term.termcode % 100 == 1)? "Spring" :
                    (term.termcode % 100 == 9)? "Fall" :
                    "Summer"
                } {parseInt(term.termcode/100) /* Year */} ({term.termcode})
            </h3>
            <div className="term-options">
                <div className="term-option">
                    <IoFilterOutline
                        className="filter-icon"
                        title="Table Options and Filtering"
                        style={{margin: -5+"px"}}
                        onClick={() => {
                            let filterDiv = document.getElementById(term.termcode+"FilterDiv");
                            if(filterDiv.classList.contains("hidden"))
                                filterDiv.classList.remove("hidden");
                            else
                                filterDiv.classList.add("hidden");
                        }}
                    />
                </div>
                <div className="term-option">
                    <label
                        for={term.termcode+"-open"}
                        className="form-label"
                    >Open: </label>
                    <input
                        id={term.termcode+"-open"}
                        className="form-control"
                        type="date"
                        defaultValue={(term.open == null) ? null : term.open.split('T')[0]}
                    ></input>
                </div>
                <div className="term-option">
                    <label
                        for={term.termcode+"-close"}
                        className="form-label"
                    >Close: </label>
                    <input
                        id={term.termcode+"-close"}
                        className="form-control"
                        type="date"
                        defaultValue={(term.close == null) ? null : term.close.split('T')[0]}
                    ></input>
                </div>
                <button
                    className="btn btn-warning term-option"
                    onClick={() => changeDates(
                        term.termcode,
                        document.getElementById(term.termcode+"-open").value,
                        document.getElementById(term.termcode+"-close").value,
                    )}
                >Update</button>
                <button
                    className="btn btn-danger term-option"
                    onClick={() => dropTerm(term.termcode)}
                >Drop</button>
            </div>
        </div>
        <div className="term-wrapper">
            {(sections.length > 0) ? (
            <>
                <div id={term.termcode+"FilterDiv"} style={{paddingTop:1+"em"}} className="hidden">
                    <div style={{display: "inline-block"}}>
                        <div style={{float:"left"}}>
                            <b className="filter-title">Table Options:</b>
                        </div>
                        <div style={{float:"left"}}>
                            <div>
                                <label className="filter-column" for={term.termcode+"SortBy"}>Sort By:</label>
                                <select
                                    id={term.termcode+"SortBy"}
                                    class="form-select"
                                    defaultValue={"course_id"}
                                    onChange={(e) => sortSections(
                                        e.target.value,
                                        {
                                            active: document.getElementById(term.termcode+"ActiveFilter").value,
                                            campus: document.getElementById(term.termcode+"CampusFilter").value,
                                            enrollment: document.getElementById(term.termcode+"EnrollmentFilter").value,
                                            grad: document.getElementById(term.termcode+"GradFilter").value
                                        }
                                    )}
                                >
                                    <option value="crn">CRN</option>
                                    <option value="course_id">Course ID</option>
                                    <option value="course_name">Course Name</option>
                                </select>
                            </div>
                            <div>
                                <label className="filter-column" for={term.termcode+"SectionsPerPage"}>Sections/Page:</label>
                                <select
                                    id={term.termcode+"SectionsPerPage"}
                                    class="form-select"
                                    defaultValue={sectionsPerPage}
                                    onChange={(e) => {
                                        setSectionsPerPage(e.target.value);
                                    }}
                                >
                                    <option value={10}>10</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={sections.length}>All</option>
                                </select>
                            </div>
                        </div>
                        <div className="vl"/>
                    </div>
                    <div style={{display: "inline-block"}}>
                        <div style={{float:"left"}}>
                            <b className="filter-title">Filters:</b>
                        </div>
                        <div style={{float:"left"}}>
                            <div>
                                <label className="filter-column" for={term.termcode+"ActiveFilter"}>Active:</label>
                                <select
                                    id={term.termcode+"ActiveFilter"}
                                    class="form-select"
                                    defaultValue={0}
                                    onChange={(e) => sortSections(
                                        document.getElementById(term.termcode+"SortBy").value,
                                        {
                                            active: e.target.value,
                                            campus: document.getElementById(term.termcode+"CampusFilter").value,
                                            enrollment: document.getElementById(term.termcode+"EnrollmentFilter").value,
                                            grad: document.getElementById(term.termcode+"GradFilter").value
                                        }
                                    )}
                                >
                                    <option value={0}>Active/Inactive</option>
                                    <option value={-1}>Inactive Only</option>
                                    <option value={1}>Active Only</option>
                                </select>
                            </div>
                            <div>
                                <label className="filter-column" for={term.termcode+"CampusFilter"}>Campus:</label>
                                <select
                                    id={term.termcode+"CampusFilter"}
                                    class="form-select"
                                    defaultValue={-1}
                                    onChange={(e) => sortSections(
                                        document.getElementById(term.termcode+"SortBy").value,
                                        {
                                            active: document.getElementById(term.termcode+"ActiveFilter").value,
                                            campus: e.target.value,
                                            enrollment: document.getElementById(term.termcode+"EnrollmentFilter").value,
                                            grad: document.getElementById(term.termcode+"GradFilter").value
                                        }
                                    )}
                                >
                                    <option value={-1}>Any Campus</option>
                                    <option value={0}>Blacksburg Only</option>
                                    <option value={4}>National Capital Region Only</option>
                                    <option value={10}>Virtual Only</option>
                                </select>
                            </div>
                        </div>
                        <div style={{float:"left"}}>
                            <div>
                                <label className="filter-column" for={term.termcode+"EnrollmentFilter"}>Enrollment:</label>
                                <select
                                    id={term.termcode+"EnrollmentFilter"}
                                    class="form-select"
                                    defaultValue={0}
                                    onChange={(e) => sortSections(
                                        document.getElementById(term.termcode+"SortBy").value,
                                        {
                                            active: document.getElementById(term.termcode+"ActiveFilter").value,
                                            campus: document.getElementById(term.termcode+"CampusFilter").value,
                                            enrollment: e.target.value,
                                            grad: document.getElementById(term.termcode+"GradFilter").value
                                        }
                                    )}
                                >
                                    <option value={0}>Any</option>
                                    <option value={1}>Has Space</option>
                                    <option value={-1}>Full</option>
                                </select>
                            </div>
                            <div>
                                <label className="filter-column" for={term.termcode+"GradFilter"}>Class Level:</label>
                                <select
                                    id={term.termcode+"GradFilter"}
                                    class="form-select"
                                    defaultValue={0}
                                    onChange={(e) => sortSections(
                                        document.getElementById(term.termcode+"SortBy").value,
                                        {
                                            active: document.getElementById(term.termcode+"ActiveFilter").value,
                                            campus: document.getElementById(term.termcode+"CampusFilter").value,
                                            enrollment: document.getElementById(term.termcode+"EnrollmentFilter").value,
                                            grad: e.target.value
                                        }
                                    )}
                                >
                                    <option value={0}>Any</option>
                                    <option value={1}>Graduate Only</option>
                                    <option value={2}>Undergraduate Only</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                <table className="table">
                    <thead>
                        <tr>
                            <th>CRN</th>
                            <th>Course ID</th>
                            <th>Course Name</th>
                            <th>Credit Hours</th>
                            <th>Instructor</th>
                            <th>Meet Days</th>
                            <th>Begin Time</th>
                            <th>End Time</th>
                            <th>Location</th>
                            <th>Campus</th>
                            <th>Current Enrollment</th>
                            <th>Max Enrollment</th>
                            <th>Active</th>
                            <th>Ignore Enrollment</th>
                        </tr>
                    </thead>
                    <tbody>
                    {sectionsPage.map((section) => (
                        <tr>
                            <td>{section.crn}</td>
                            <td style={{textWrap: "nowrap"}}>{section.course_id}</td>
                            <td style={{textWrap: "nowrap"}}>{section.course_name}</td>
                            <td>{section.credit_hrs}</td>
                            <td>{section.instructor}</td>
                            <td>{section.meet_days}</td>
                            <td style={{textWrap: "nowrap"}}>{(section.begin_time == 0 || parseInt(section.begin_time/100) == 12) ? 12 : parseInt(section.begin_time/100)%12}:{(section.begin_time < 10) ? "0":""}{section.begin_time.toString().slice(-2)} {(section.begin_time < 1200) ? "AM" : "PM"}</td>
                            <td style={{textWrap: "nowrap"}}>{(section.end_time == 0 || parseInt(section.end_time/100) == 12) ? 12 : parseInt(section.end_time/100)%12}:{(section.end_time < 10) ? "0":""}{section.end_time.toString().slice(-2)} {(section.end_time < 1200) ? "AM" : "PM"}</td>
                            <td style={{textWrap: "nowrap"}}>{section.location}</td>
                            <td>{section.campus == 0 ? "Blacksburg" : section.campus == 4 ? "National Capital Region" : "Virtual"}</td>
                            <td>{section.current_enrollment}</td>
                            <td>{section.max_enrollment}</td>
                            <td>
                                <input
                                    id={term.termcode+"-"+section.crn+"-active"}
                                    type="checkbox"
                                    checked={section.active == 1}
                                    onChange={(e) => {
                                        setCRNState(
                                            section.crn,
                                            e.target.checked ? 1 : 0
                                        )
                                        //toggleCRNActive(section.crn)
                                    }}
                                ></input>
                            </td>
                            <td>
                                <input
                                    id={term.termcode+"-"+section.crn+"-ignore"}
                                    type="checkbox"
                                    checked={section.ignore_enrollment == 1}
                                    onChange={(e) => {
                                        setCRNIgnore(
                                            section.crn,
                                            e.target.checked ? 1 : 0
                                        )
                                    }}
                                ></input>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                <PaginationComponent
                    pageCount={Math.ceil(sortedSections.length / sectionsPerPage)}
                    onPageChange={handlePageChange}
                    currentPage={currentPage}
                />
            </>
            ) : (
            <p>No classes found for this term</p>
            )}
        </div>
    </div>)}</>)
}