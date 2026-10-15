import React, {useState, useEffect} from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { statusIsGood } from "../../../helpers/http";
import "../../../css/TableShrink.css"

export default function AdvisorReview() {
    const { key } = useParams();
    const [forceAdd, setForceAdd] = useState({});
    const [isLoaded, setIsLoaded] = useState(false);
    const [forceAdds, setForceAdds] = useState([]);
    const [forceAddFiles, setForceAddFiles] = useState([]);
    
    useEffect(() => {
        try {
            axios.get(`/api/forceadd/${key}`)
            .then((response) => {
                const fa = response.data.forceadd;
                setForceAdd(fa);
            })//.then(() => {
            //    setIsLoaded(true);
            //})
        } catch (error) {
            console.error("Error fetching forceadd for review: ", error);
        }
    }, []);

    //Get the files associated with this ForceAdd
    useEffect(() => {
        try {
            axios.get(`/api/forceadd/files/${key}`)
            .then((response) => {
                setForceAddFiles(response.data.files.result);
            })
        } catch (error) {
            console.error("Error fetching files associated with ForceAdd: ",error);
        }
    }, [])

    useEffect(() => {
        //Load the student's other force adds
        try {
            //https://saacs-test.endeavour.cs.vt.edu/api/forceadd?status=0&sort1=submission_timestamp&sortdir=ASC&perpage=10&page=0&sort2=submission_timestamp
            axios.get(`/api/forceadd?pid=${forceAdd.pid}`)
            .then((response) => {
                const fas = response.data.forceadds;
                setForceAdds(fas);
            }).then(() => {
                setIsLoaded(true);
            })
        } catch (error) {
            console.error("Error fetching forceadds for table: ", error);
        }
    }, [forceAdd])

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

    const saveComments = () => {
        try{
            axios.post(`/api/forceadd/${key}/comments`, {
                internal: document.getElementById("internal").value || "",
                external: document.getElementById("external").value || ""
            }).then((response) => {
                if(statusIsGood(response.status))
                    alert("Updated comments")
                else
                    alert("An error occured whilst saving your comments");
            }).catch((error) => {
                if(error.response)
                    console.error(error.response.status+":"+error.response.data);
                else if(error.request)
                    console.error(error.request)
                else
                    console.error('Error', error.message);
                console.error(error.config)
                alert("An error occured whilst saving your comments");
            })
        } catch(error) {
            console.error("Error changing comments: ",error);
            alert("An error occured whilst saving your comments");
        }
    }

    const changeStatus = () => {
        let c =  window.confirm("Changing the status of this request to anything but \"Wait Listed\" or \"Pending Review\" will lock the request from further modification.")
        if(!c) //Don't continue if user isn't ready
            return;
        try{
            //Save Comments First
            try{
                axios.post(`/api/forceadd/${key}/comments`, {
                    internal: document.getElementById("internal").value || "",
                    external: document.getElementById("external").value || ""
                }).then((response) => {
                    if(statusIsGood(response.status)) {
                        //Now Change Status
                        axios.post(`/api/forceadd/${key}/status`, {
                            newstatus: document.getElementById("new-status").value
                        }).then((response) => {
                            if(statusIsGood(response.status)) {
                                alert("Updated status")
                                window.location.reload(); //Only reload if it actually locks stuff in
                            } else
                                alert("An error occured whilst changing the status");
                        }).catch((error) => {
                            if(error.response)
                                console.error(error.response.status+":"+error.response.data);
                            else if(error.request)
                                console.error(error.request)
                            else
                                console.error('Error', error.message);
                            console.error(error.config)
                            alert("An error occured whilst changing the status");
                        })
                    } else
                        alert("An error occured whilst saving your comments");
                }).catch((error) => {
                    if(error.response)
                        console.error(error.response.status+":"+error.response.data);
                    else if(error.request)
                        console.error(error.request)
                    else
                        console.error('Error', error.message);
                    console.error(error.config)
                    alert("An error occured whilst saving your comments");
                })
            } catch(error) {
                console.error("Error changing comments: ",error);
                alert("An error occured whilst saving your status and comments");
            }
        } catch(error) {
            console.error("Error changing status: ",error);
            alert("An error occured whilst submitting your change");
        }
    }

    return (
        <div className="page-body">
            {isLoaded && (
                <>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Field</th>
                                <th>Submitted Value</th>
                                <th>Banner Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{borderRight: "2px #0056b3 solid"}}>Term</td>
                                <td style={{borderRight: "2px #0056b3 solid"}}>{
                                    (forceAdd.term % 100 == 1) ? "Spring" :
                                    (forceAdd.term % 100 == 9) ? "Fall" : "Summer"
                                } {parseInt(forceAdd.term/100)} ({forceAdd.term})</td>
                                <td></td>
                            </tr>
                            <tr>
                                <td style={{borderRight: "2px #0056b3 solid"}}>Course</td>
                                <td style={{borderRight: "2px #0056b3 solid"}}>{forceAdd.course_id}</td>
                                <td></td>
                            </tr>
                            <tr>
                                <td style={{borderRight: "2px #0056b3 solid"}}>First Choice</td>
                                <td style={{borderRight: "2px #0056b3 solid"}}>{forceAdd.first_choice}</td>
                                <td></td>
                            </tr>
                            <tr>
                                <td style={{borderRight: "2px #0056b3 solid"}}>Second Choice</td>
                                <td style={{borderRight: "2px #0056b3 solid"}}>{forceAdd.second_choice}</td>
                                <td></td>
                            </tr>
                            <tr>
                                <td style={{borderRight: "2px #0056b3 solid"}}>Drop Choices</td>
                                <td style={{borderRight: "2px #0056b3 solid"}}>{forceAdd.drops}</td>
                                <td></td>
                            </tr>
                            <tr>
                                <td style={{borderRight: "2px #0056b3 solid"}}>Reason</td>
                                <td style={{borderRight: "2px #0056b3 solid"}}>{
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
                                <td></td>
                            </tr>
                            <tr>
                                <td style={{borderRight: "2px #0056b3 solid"}}>Files</td>
                                <td style={{borderRight: "2px #0056b3 solid"}}>
                                    {forceAddFiles.map((faFile) => (
                                        <>
                                            <a href={`/api/forceadd/file/${faFile.fa_file_id}`} target="_blank">{faFile.file_name.split('/').at(-1)}</a>
                                            <br />
                                        </>
                                    ))}
                                </td>
                                <td></td>
                            </tr>
                            <tr>
                                <td style={{borderRight: "2px #0056b3 solid"}}>PID</td>
                                <td style={{borderRight: "2px #0056b3 solid"}}>{forceAdd.pid}</td>
                                <td></td>
                            </tr>
                            <tr>
                                <td style={{borderRight: "2px #0056b3 solid"}}>ID Number</td>
                                <td style={{borderRight: "2px #0056b3 solid"}}>{forceAdd.id_number}</td>
                                <td></td>
                            </tr>
                            <tr>
                                <td style={{borderRight: "2px #0056b3 solid"}}>Name</td>
                                <td style={{borderRight: "2px #0056b3 solid"}}>{forceAdd.banner_name}</td>
                                <td></td>
                            </tr>
                            <tr>
                                <td style={{borderRight: "2px #0056b3 solid"}}>Degree</td>
                                <td style={{borderRight: "2px #0056b3 solid"}}>{forceAdd.degree}</td>
                                <td></td>
                            </tr>
                            <tr>
                                <td style={{borderRight: "2px #0056b3 solid"}}>Major</td>
                                <td style={{borderRight: "2px #0056b3 solid"}}>{forceAdd.major}</td>
                                <td>{forceAdd.banner_major}</td>
                            </tr>
                            <tr>
                                <td style={{borderRight: "2px #0056b3 solid"}}>Minor</td>
                                <td style={{borderRight: "2px #0056b3 solid"}}>{forceAdd.minor}</td>
                                <td></td>
                            </tr>
                            <tr>
                                <td style={{borderRight: "2px #0056b3 solid"}}>Academic Level</td>
                                <td style={{borderRight: "2px #0056b3 solid"}}></td>
                                <td>{forceAdd.academic_level}</td>
                            </tr>
                            <tr>
                                <td style={{borderRight: "2px #0056b3 solid"}}>Campus</td>
                                <td style={{borderRight: "2px #0056b3 solid"}}>{forceAdd.campus == 0 ? "Blacksburg" : forceAdd.campus == 4 ? "National Capital Region" : "Virtual"}</td>
                                <td>{forceAdd.banner_campus}</td>
                            </tr>
                            <tr>
                                <td style={{borderRight: "2px #0056b3 solid"}}>Graduation Date</td>
                                <td style={{borderRight: "2px #0056b3 solid"}}>{
                                    (forceAdd.grad_date % 100 == 1) ? "Spring" :
                                    (forceAdd.grad_date % 100 == 9) ? "Fall" : "Summer"
                                } {parseInt(forceAdd.grad_date/100)} ({forceAdd.grad_date})</td>
                                <td></td>
                            </tr>
                            <tr>
                                <td style={{borderRight: "2px #0056b3 solid"}}>Time Submitted</td>
                                <td style={{borderRight: "2px #0056b3 solid"}}>{readableTimeStamp(forceAdd.submission_timestamp)}</td>
                                <td></td>
                            </tr>
                            <tr>
                                <td style={{borderRight: "2px #0056b3 solid"}}>Status</td>
                                <td style={{borderRight: "2px #0056b3 solid"}}>{
                                    forceAdd.status == 0 ? "Pending Review" :
                                    forceAdd.status == 1 ? "Approved" :
                                    forceAdd.status == 2 ? "Wait Listed" :
                                    forceAdd.status == 3 ? "Denied - Other (Resubmission Allowed)" :
                                    forceAdd.status == 4 ? "Denied - Other (Resubmission Not Allowed)" :
                                    forceAdd.status == 5 ? "Denied - Missing Prerequisite (Resubmission Not Allowed)" :
                                    forceAdd.status == 6 ? "Denied - Class Full (Resubmission Not Allowed)" :
                                    forceAdd.status == 32 ? "Cancelled" : "D3AD B33F"
                                } ({readableTimeStamp(forceAdd.status_timestamp)})</td>
                                <td></td>
                            </tr>
                            <tr>
                                <td style={{borderRight: "2px #0056b3 solid"}}>Student Comments</td>
                                <td colSpan={2}>
                                    <textarea class="form-control form-textarea" style={{backgroundColor: "#fff"}} rows="3" disabled>
                                        {forceAdd.student_comment}
                                    </textarea>
                                </td>
                            </tr>
                            <tr>
                                <td style={{borderRight: "2px #0056b3 solid"}}>Internal Comments</td>
                                <td colSpan={2}>
                                    <textarea id="internal" class="form-control form-textarea" rows="3" maxLength={255} style={{backgroundColor: "#fff"}} disabled={forceAdd.status !== 0 && forceAdd.status !== 2}>
                                        {forceAdd.internal_comments}
                                    </textarea>
                                </td>
                            </tr>
                            <tr>
                                <td style={{borderRight: "2px #0056b3 solid"}}>External Comments</td>
                                <td colSpan={2}>
                                    <textarea id="external" class="form-control form-textarea" rows="3" maxLength={255} style={{backgroundColor: "#fff"}} disabled={forceAdd.status !== 0 && forceAdd.status !== 2}>
                                        {forceAdd.external_comments}
                                    </textarea>
                                </td>
                            </tr>
                            {(forceAdd.status == 0 || forceAdd.status == 2) && (
                            <tr>
                                <td style={{borderRight: "2px #0056b3 solid"}}>Actions</td>
                                <td>
                                    <select
                                        id="new-status"
                                        className="form-select"
                                        defaultValue={forceAdd.status}
                                        /*onChange={(e) => {
                                            if(e.target.value == forceAdd.status)
                                                document.getElementById("new-status-btn").disabled = true;
                                            else
                                                document.getElementById("new-status-btn").disabled = false;
                                        }}*/
                                    >
                                        <option value={0}>Pending Review</option>
                                        <option value={1}>Approved</option>
                                        <option value={3}>Denied - Other (Resubmission Allowed)</option>
                                        <option value={4}>Denied - Other (Resubmission Not Allowed)</option>
                                        <option value={5}>Denied - Missing Prerequisite (Resubmission Not Allowed)</option>
                                        <option value={6}>Denied - Class Full (Resubmission Not Allowed)</option>
                                        <option value={32}>Canceled</option>
                                    </select>
                                    <button
                                        id="new-status-btn"
                                        type="button"
                                        className="btn btn-warning"
                                        onClick={() => changeStatus()}
                                    >Change Status</button>
                                </td>
                                <td>
                                    <button
                                        type="button"
                                        className="btn btn-success"
                                        onClick={() => saveComments()}
                                    >Save Comments</button>
                                </td>
                            </tr>)}
                        </tbody>
                    </table>
                    
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Term</th>
                                <th>Course</th>
                                <th>First Choice</th>
                                <th>Second Choice</th>
                                <th>Reason</th>
                                <th>Time Submitted</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {forceAdds.map(fa => (
                                (fa.forceadd_id !== forceAdd.forceadd_id) ?
                                    <tr>
                                        <td>{
                                            (fa.term % 100 == 1) ? "Spring" :
                                            (fa.term % 100 == 9) ? "Fall" : "Summer"
                                        } {parseInt(fa.term/100)} ({fa.term})</td>
                                        <td>{fa.course_id}</td>
                                        <td>{fa.first_choice}</td>
                                        <td>{fa.second_choice}</td>
                                        <td>{
                                            fa.reason == 0 ? "D3AD B33F" :
                                            fa.reason == 1 ? "You are a current CS/DCC/SC major or CS/HCI minor, AND your major/minor is included in the class restrictions, but you cannot register." :
                                            fa.reason == 2 ? "Graduate student attempting to add an undergraduate course and have received direction from the CS Department to submit this request. Please add details in the comment box." :
                                            fa.reason == 3 ? "You did not earn a C or better in a CS course in the prior semester and need to repeat the course." :
                                            fa.reason == 4 ? "You took an approved alternate course and are approved to override the prerequisite(s) in CS 4824 or CS 3654 (these are the ONLY courses with approved overrides)." :
                                            fa.reason == 5 ? "You want to enroll in CS 3984, 3894, 4894 or 4984, and cannot as these courses require force/adding to enroll." :
                                            fa.reason == 6 ? "Only select this option if you were instructed by your CS major or minor advisor to submit this request. Please include details in the comment box below." :
                                            fa.reason == 13 ? "You have completed an approved alternate prerequisite but cannot register (ex: Took ECE 2514 in place of CS 1114)." :
                                            fa.reason == 7 ? "Prerequisites were completed outside of VT and your student record hasn't been updated." :
                                            fa.reason == 8 ? "The course is restricted by major, but the course is required for your major, minor, degree, or graduate certificate." :
                                            fa.reason == 9 ? "The course is restricted by major, but you are a prospective student or Commonwealth Campus student." :
                                            fa.reason == 10 ? "The course requires department or faculty approval." :
                                            fa.reason == 11 ? "Currently retaking a prerequisite." :
                                            fa.reason == 12 ? "I am an Accelerated MS/MEng 4+1 student." :
                                            "Other"
                                        }</td>
                                        <td>{
                                            fa.status == 0 ? "Pending Review" :
                                            fa.status == 1 ? "Approved" :
                                            fa.status == 2 ? "Wait Listed" :
                                            fa.status == 3 ? "Denied - Other (Resubmission Allowed)" :
                                            fa.status == 4 ? "Denied - Other (Resubmission Not Allowed)" :
                                            fa.status == 5 ? "Denied - Missing Prerequisite (Resubmission Not Allowed)" :
                                            fa.status == 6 ? "Denied - Class Full (Resubmission Not Allowed)" :
                                            fa.status == 32 ? "Cancelled" : "D3AD B33F"
                                        } ({readableTimeStamp(fa.status_timestamp)})</td>
                                        <td>{readableTimeStamp(fa.submission_timestamp)}</td>
                                        <td><a class="btn btn-primary" href={"/forceadd/"+fa.forceadd_id}>View</a></td>
                                    </tr>
                                :
                                    <></>
                            ))}
                        </tbody>                
                    </table>
                </>
            )}
        </div>
    )
}