import React, {useState, useEffect} from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { statusIsGood } from "../../../helpers/http";

export default function AdvisorReview() {
    const { key } = useParams();
    const [forceAdd, setForceAdd] = useState({});
    const [forceAddFiles, setForceAddFiles] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);
    
    useEffect(() => {
        try {
            axios.get(`/api/forceadd/${key}`)
            .then((response) => {
                console.log(response.data);
                console.log(response.data.forceadd);
                const fa = response.data.forceadd;
                setForceAdd(fa);
            }).then(() => {
                setIsLoaded(true);
            })
        } catch (error) {
            console.error("Error fetching forceadd for review: ", error);
        }
    }, []);

    //Get the files associated with this ForceAdd
    useEffect(() => {
        try {
            axios.get(`/api/forceadd/files/${key}`)
            .then((response) => {
                console.log("FAFiles:");
                console.log(response.data.files.result);
                setForceAddFiles(response.data.files.result);
            })
        } catch (error) {
            console.error("Error fetching files associated with ForceAdd: ",error);
        }
    }, [])

    useEffect(() => {
        console.log(forceAdd);
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

    return (
        <div className="page-body">
            {isLoaded && (
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
                            <td style={{borderRight: "2px #0056b3 solid"}}>Advisor Comments</td>
                            <td colSpan={2}>
                                <textarea id="external" class="form-control form-textarea" rows="3" maxLength={255} style={{backgroundColor: "#fff"}} disabled={forceAdd.status !== 0 && forceAdd.status !== 2}>
                                    {forceAdd.external_comments}
                                </textarea>
                            </td>
                        </tr>
                    </tbody>
                </table>
            )}
        </div>
    )
}