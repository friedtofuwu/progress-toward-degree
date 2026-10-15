import React, {useState, useEffect} from "react";
import axios from 'axios';
import "./../../../css/Forms.css"
import { statusIsGood } from "../../../helpers/http";

export default function ForceAddForm() {
    const [isLoaded, setIsLoaded] = useState(false);
    const [terms, setTerms] = useState([]); //Array of terms
    const [courses, setCourses] = useState([]); //Arrays of available sections broken up by course
    const [sections, setSections] = useState([]);
    const [forceAdds, setForceAdds] = useState([]);
    const [term, setTerm] = useState(0); //Chosen term
    const [course, setCourse] = useState(""); //Chosen course
    const [firstChoice, setFirstChoice] = useState(null); //First choice section
    const [secondChoice, setSecondChoice] = useState(null); //Second choice section

    // Fetch the terms currently available for force add
    const fetchTerms = async() => {
        try {
            axios.get("/api/term/active").then((response) => {
                const termsData = response.data.terms || [];
                setTerms(termsData);
            });
        } catch (error) {
            console.error("Error getting active terms: ", error);
        }
    }

    //Fetch all pre-existing forceadd request to block out repeat submissions
    const fetchForceAdds = async() => {
        try {
            axios.get(
                "/api/forceadd"
            ).then((response) => {
                const forceAddData = response.data.forceadds || [];
                //Break them up by term and then by class keeping only those that can't resubmit
                let blockedCourses = []
                forceAddData.forEach((fa) => {
                    if(fa.status != 3 && fa.status != 32)
                        blockedCourses.push(fa.term+fa.course_id);
                });
                setForceAdds(blockedCourses);
            })
        } catch (error) {
            console.error("Error getting forceAdds: ", error);
        }
    }

    // Fetch the sections within the term that can be force added and break up by course
    const fetchCourses = async(term) => {
        try {
            console.log(`FETCHING COURSES FOR ${term}`)
            axios.get(`/api/classes/${term}`)
            .then((response) => {
                const coursesData = response.data.classes || [];
                console.log(`GOT ${coursesData.length} RESULTS FROM TIMETABLE`)
                setCourses(coursesData);
                setSections([]); //Empty sections
                setFirstChoice("bad"); //Clear Choices
                setSecondChoice("");
                //if(Object.keys(courses).length > 0 && document.getElementById("course"))
                //    document.getElementById("course").disabled = false;
                //else
                //    document.getElementById("course").disabled = true;
                console.log("SET COURSES")
            })
        } catch (error) {
            console.error("Error getting active courses: ", error);
        }
    }

    // Pull the relevant sections from the list of courses
    const fetchSections = async() => {
        let term = document.getElementById("term").value;
        let course = document.getElementById("course").value;
        try {
            console.log(`FETCHING SECTIONS FOR TERM ${term} AND CLASS ${course}`);
            axios.get(`/api/classes/${term}/${course}`)
            .then((response) => {
                const sectionsData = response.data.timetable || [];
                console.log(`GOT ${sectionsData.length} RESULTS FROM TIMETABLE`)
                setSections(sectionsData);
                setFirstChoice("bad"); //Clear Choices
                setSecondChoice("");
            })
        } catch (error) {
            console.error("Error getting sections: ",error);
        }
    }

    const calcGradDates = () => {
        //Get current date info
        const d = new Date();
        let year = d.getFullYear();
        let month = d.getMonth();//0 indexed

        //Get current semester 
        let semester =
            (month >= 8) ? 9 : //Fall
            (month >= 5) ? 6 : //Summer
            1 //Spring
        
        let grads = [];
        //Loop for 4 years * 3 semesters = 12
        for(let i = 0; i < 12; i++) {
            let semText = 
            (semester == 9) ? "Fall" :
            (semester == 6) ? "Summer" :
            (semester == 1) ? "Spring" :
            "ERROR";
            grads.push([year*100+semester, semText+" "+year]);
            if (semester == 9) {
                semester = 1;
                year++;
            } else if(semester == 6)
                semester = 9;
            else if(semester == 1)
                semester = 6;
        }
        return grads;
    }

    const handleSubmit = async() => {
        if(!isLoaded) return;
        //Check required fields and validate
        let gotReqs = true; //To see if a value is missing
        // 1. Degree
        let degreeSelection = document.querySelector('input[name="degree"]:checked');
        let degreeValue = "";
        if(degreeSelection) {
            document.getElementById("degree-error").classList.add("hidden");
            if (degreeSelection.value == "Other")
                degreeValue = document.getElementById("degree-other-text").value;
            else
                degreeValue = degreeSelection.value;
            if(!degreeValue)
                degreeSelection = null
        }
        if(!degreeSelection) {
            document.getElementById("degree-error").classList.remove("hidden");
            gotReqs = false;
        }
        // 2. Major
        let majorSelection = document.querySelector('input[name="major"]:checked');
        let majorValue = "";
        if(majorSelection) {
            document.getElementById("major-error").classList.add("hidden");
            if(majorSelection.value == "Other")
                majorValue = document.getElementById("major-Other-Text").value;
            else
                majorValue = majorSelection.value;
            if(!majorValue)
                majorSelection = null;
        }
        if(!majorSelection) {
            document.getElementById("major-error").classList.remove("hidden");
            gotReqs = false;
        }
        // 3. Minor is not required
        // 4. Graduation Date
        if(document.getElementById("grad-date").value == "") {
            document.getElementById("grad-date-error").classList.remove("hidden");
            gotReqs = false;
        } else {
            document.getElementById("grad-date-error").classList.add("hidden");
        }
        // 5. Campus
        if(document.getElementById("campus").value == "") {
            document.getElementById("campus-error").classList.remove("hidden");
            gotReqs = false;
        } else {
            document.getElementById("campus-error").classList.add("hidden");
        }
        // 6. Term
        if(term == 0) {
            document.getElementById("term-error").classList.remove("hidden");
            gotReqs = false;
        } else
            document.getElementById("term-error").classList.add("hidden");
        // 7. Course
        if(course == "") {
            document.getElementById("course-error").classList.remove("hidden");
            gotReqs = false;
        } else
            document.getElementById("course-error").classList.add("hidden");
        // 8. First choice is now required
        if(!firstChoice || firstChoice == "bad") {
            document.getElementById("first-error").classList.remove("hidden");
            gotReqs = false;
        } else {
            document.getElementById("first-error").classList.add("hidden");
        }
        // 9. Drops is not required BUT need to make sure it fits formatting
        if(document.getElementById("dropables").value.match(/^(\d{5},\s*)*\d{5}$/))
            document.getElementById("dropables-error").classList.add("hidden");
        else if(document.getElementById("dropables").value === "")
            document.getElementById("dropables-error").classList.add("hidden");
        else {
            document.getElementById("dropables-error").classList.remove("hidden");
            gotReqs = false;
        }
        // 10. Reason
        if(document.getElementById("reason").value == 0) {
            document.getElementById("reason-error").classList.remove("hidden");
            gotReqs = false;
        } else
            document.getElementById("reason-error").classList.add("hidden");
        // 10b. Document Upload
        if( //Field only exists if reason 7 selected
            document.getElementById("reason").value == "7" ||
            document.getElementById("reason").value == 7
        ) {
            //Ensure there's actually files
            if(document.getElementById("documents").files.length == 0) {
                document.getElementById("documents-error").classList.remove("hidden");
                gotReqs = false;
            } else if(!checkFileTypes()) { //Ensure correct file types
                gotReqs = false;
            } else {
                document.getElementById("documents-error").classList.add("hidden");
            }
        } else {
            document.getElementById("documents-error").classList.add("hidden");
        }
        //11. Additional Comments
        // CONSENT
        if(document.getElementById("consent").checked)
            document.getElementById("consent-error").classList.add("hidden");
        else {
            document.getElementById("consent-error").classList.remove("hidden");
            gotReqs = false;
        }

        if(!gotReqs) {
            alert("Missing Required Fields!");
            return;
        }
        
        try {
            let fd = new FormData();
            fd.append("degree", degreeValue);
            fd.append("major", majorValue);
            fd.append("minor", document.getElementById("minor").value);
            fd.append("grad_date", document.getElementById("grad-date").value);
            fd.append("campus", document.getElementById("campus").value);
            fd.append("term", term);
            fd.append("course", course);
            fd.append("first_choice", firstChoice);
            fd.append("second_choice", secondChoice);
            fd.append("drops", document.getElementById("dropables").value);
            fd.append("reason", document.getElementById("reason").value);
            var files = document.getElementById("documents").files;
            for(var i = 0; i < files.length; i++) {
                fd.append("files[]",files[i]);
            }
            fd.append("comments", document.getElementById("comments").value);
            fd.append("consent", document.getElementById("consent").checked);
            axios.post("/api/forceadd", fd).then((response) => {
                // Redirect to status page on success
                if(statusIsGood(response.status))
                    window.location.href="/forceadd";
                //Alert user if failed
                else
                    alert("An error occured with your submission");
            }).catch((error) => {
                if (error.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    console.error(error.response.data);
                    console.error(error.response.status);
                    console.error(error.response.headers);
                } else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    console.error(error.request);
                } else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error', error.message);
                }
                console.error(error.config);
                alert("An error occured whilst submitting your form");
            })
        } catch(error) {
            console.error("Error submitting form: ", error);
            alert("An error occured whilst submitting your form");
        }
    }

    const handleOtherDegree = () => {
        var selector = document.querySelector('input[name="degree"]:checked');
        if(selector)
            if(selector.value != "Other")
                document.getElementById("degree-other-text").value = "";
    }

    const handleOtherMajor = () => {
        var selector = document.querySelector('input[name="major"]:checked');
        if(selector)
            if(selector.value != "Other")
                document.getElementById("major-Other-Text").value = "";
    }

    const handleDocumentsUpload = (reason) => {
        if(reason == 7 || reason == "7") {
            document.getElementById("documents-div").classList.remove("hidden");
        } else {
            document.getElementById("documents-div").classList.add("hidden");
        }
    }

    const checkFileTypes = () => {
        const allowedTypes = ["application/pdf","image/png", "image/jpeg"]
        var files = document.getElementById("documents").files;
        for(var i = 0; i < files.length; i++) {
            console.log(`${JSON.stringify(files[i])}`)
            if(!allowedTypes.includes(files[i].type)) {
                document.getElementById("documents-type-error").classList.remove("hidden");
                return false;
            } else {
                document.getElementById("documents-type-error").classList.add("hidden");
            }
        }
        return true;
    }

    /*const consentOffice = (d) => {
        let o = document.getElementById("office");
        if(parseInt(d.charAt(3)) < 5) { //Undergrad
            o.href = "mailto:csundergrad@vt.edu";
            o.innerText = "csundergrad@vt.edu";
        } else { //Grad
            o.href = "mailto:gradinfo@cs.vt.edu";
            o.innerText = "gradinfo@cs.vt.edu";
        }
    }*/

    // Fetch terms and student data on load
    useEffect(() => {
        fetchTerms(); // Get the terms
        fetchForceAdds(); // Get forceadds
        setIsLoaded(true);
        //fetchStudent(); // Get the student's data 
    }, [])

    //Adjust reasons based on classlevel choice
    useEffect(() => {
        //Need to check if the course choice matches an already selected reason
        if(course) { //Ignore empty course choice (Shouldn't happen anyways)
            let r = document.getElementById("reason");
            if(
                (course.charAt(3) == "1" || course.charAt(3) == "2" || course.charAt(3) == "3" || course.charAt(3) == "4") && 
                (r.value > 6 || r.value == 0)
            ) { //Need to replace reasons
                let ugReasons = {
                    1:"You are a current CS/DCC/SC major or CS/HCI minor, AND your major/minor is included in the class restrictions, but you cannot register.",
                    2:"Graduate student attempting to add an undergraduate course and have received direction from the CS Department to submit this request. Please add details in the comment box.",
                    3:"You did not earn a C or better in a CS course in the prior semester and need to repeat the course.",
                    4:"You took an approved alternate course and are approved to override the prerequisite(s) in CS 4824 or CS 3654 (these are the ONLY courses with approved overrides).",
                    5:"You want to enroll in CS 3984, 3894, 4894 or 4984, and cannot as these courses require force/adding to enroll.",
                    6:"Only select this option if you were instructed by your CS major or minor advisor to submit this request. Please include details in the comment box below.",
                    7:"Prerequisites were completed outside of VT and your student record hasn't been updated.",
                    13:"You have completed an approved alternate prerequisite but cannot register (ex: Took ECE 2514 in place of CS 1114)."
                }
                replaceReasons(ugReasons);
            } else if(
                (course.charAt(3) == "5" || course.charAt(3) == "6" || course.charAt(3) == "7" || course.charAt(3) == "8") &&
                (r.value < 7)
            ) { //Need to replace reasons
                let gReasons = {
                    7:"Prerequisites were completed outside of VT and your student record hasn't been updated.",
                    8:"The course is restricted by major, but the course is required for your major, minor, degree, or graduate certificate.",
                    9:"The course is restricted by major, but you are a prospective student or Commonwealth Campus student.",
                    10:"The course requires department or faculty approval.",
                    11:"Currently retaking a prerequisite.",
                    12:"I am an Accelerated MS/MEng 4+1 student."
                }
                replaceReasons(gReasons);
            }
        }
    },[course])

    const replaceReasons = (newReasons) => {
        //Get the reasons select
        let r = document.getElementById("reason");
        //Delete all but the default reason
        while(r.options.length > 1) {
            r.remove(1);
        }
        //Add the new reasons
        for(const [key, value] of Object.entries(newReasons)) {
            let o = document.createElement("option");
            o.value = key;
            o.text = value;
            r.add(o);
        }
        //Reset choice selection to 0
        r.value = 0;
    }
    return (
        <div className="page-body">
            {isLoaded && (
                <>
                <h1>Force Add Request Form</h1>
                <ul>
                    <li>The force/add system is for both undergraduate and graduate courses and only to be used to request to be force/added into a CS course.</li>
                    <li>The form within this system is only for CS courses and cannot be used for courses from other departments.</li>
                    <li>Not all CS courses are included on the force-add form. Some courses are already listed on the timetable at maximum capacity and will not be included on this form. If the course is not on this form, the course is not able to be force/added at this time. Students should continue to monitor drop/add for openings in those courses.</li>
                    <li>Students are encouraged to check their schedule for any time conflicts BEFORE submitting a request. Requests with time conflicts cannot be processed.</li>
                    <li>Each student should manage their schedule carefully. If a student drops a course for which they were force/added, it is unlikely that they will be re-added to that course. Additionally, if a student is force-added to a section, they will not later be moved to a different section. Our priority is making sure that each student gets the seat they need, and we cannot facilitate schedule changes.</li>
                    <li>When a student submits a force/add request, they will receive a confirmation email that they request is received. Once the request has been processed, they will receive a follow-up email. Students can also log into the force/add system to see the status of their request and cancel their request if it is no longer needed.</li>
                    <li>Please expect a review and response of request submissions to take a minimum of 72 hours. Reviews only take place during business hours, Monday-Friday 8:30am-5:00pm. Submitting this form DOES NOT GUARANTEE that you will be added to a class or to a preferred CRN.</li>
                    <li>Questions about undergraduate courses should be directed to <a href="mailto:csundergrad@vt.edu">csundergrad@vt.edu</a> & graduate courses to <a href="mailto:gradinfo@cs.vt.edu">gradinfo@cs.vt.edu</a>.</li>
                </ul>
                <form>
                    <fieldset style={{borderRadius: 0.5+'em'}}>
                        <legend>Student Information</legend>
                        <div>
                            <p for="degree" className="form-label">
                                1. Current Degree<strong display="color: red">*</strong>
                            </p>
                            <div class="form-options-div">
                                <div>
                                    <input type="radio" id="degree-BS" name="degree" value="BS" onChange={() => {handleOtherDegree()}} />
                                    <label for="degree-BS" className="form-radio-options">Bachelor of Science (BS)</label>
                                </div>
                                <div>
                                    <input type="radio" id="degree-BM" name="degree" value="BM" onChange={() => {handleOtherDegree()}} />
                                    <label for="degree-BM" className="form-radio-options">Accelerated BS/MS or MEng (4+1)</label>
                                </div>
                                <div>
                                    <input type="radio" id="degree-MS" name="degree" value="MS" onChange={() => {handleOtherDegree()}} />
                                    <label for="degree-MS" className="form-radio-options">Master of Science (MS)</label>
                                </div>
                                <div>
                                    <input type="radio" id="degree-MEng" name="degree" value="MEng" onChange={() => {handleOtherDegree()}} />
                                    <label for="degree-MEng" className="form-radio-options">Master of Engineering (MEng)</label>
                                </div>
                                <div>
                                    <input type="radio" id="degree-PhD" name="degree" value="PhD" onChange={() => {handleOtherDegree()}} />
                                    <label for="degree-PhD" className="form-radio-options">Doctor of Philosophy (PhD)</label>
                                </div>
                                <div>
                                    <input type="radio" id="degree-other" name="degree" value="Other" onChange={() => {handleOtherDegree()}} />
                                    <input type="text" id="degree-other-text" placeholder="Other" className="form-control" style={{ lineHeight:1 }} onChange={(e) => {
                                        if(e.target.value != "")
                                            document.getElementById("degree-other").checked = true;
                                    }}/>
                                </div>
                            </div>
                            <label
                                for="degree"
                                id="degree-error"
                                className="feedback hidden"
                            >
                                This is a required field
                            </label>
                        </div>
                        <div>
                            <p className="form-label">
                                2. Current Declared Major (not anticipated or planned, but actual)<strong>*</strong>
                            </p>
                            <div class="form-options-div">
                                <div>
                                    <input type="radio" id="major-CS" name="major" value="CS" onChange={() => {handleOtherMajor()}} />
                                    <label for="major-CS" class="form-radio-options">Computer Science</label>
                                </div>
                                <div>
                                    <input type="radio" id="major-DCC" name="major" value="DCC" onChange={() => {handleOtherMajor()}} />
                                    <label for="major-DCC" class="form-radio-options">Data Centric Computing</label>
                                </div>
                                <div>
                                    <input type="radio" id="major-SC" name="major" value="SC" onChange={() => {handleOtherMajor()}} />
                                    <label for="major-SC" class="form-radio-options">Secure Computing</label>
                                </div>
                                <div>
                                    <input type="radio" id="major-CSA" name="major" value="CSA" onChange={() => {handleOtherMajor()}} />
                                    <label for="major-CSA" class="form-radio-options">Computer Science & Applications</label>
                                </div>
                                <div>
                                    <input type="radio" id="major-Other" name="major" value="Other" onChange={() => {handleOtherMajor()}} />
                                    <input type="text" id="major-Other-Text" placeholder="Other" className="form-control" style={{lineHeight: 1}} onChange={(e) => {
                                        if(e.target.value != "")
                                            document.getElementById("major-Other").checked = true;
                                    }}/>
                                </div>
                            </div>
                            <label
                                for="major"
                                id="major-error"
                                className="feedback hidden"
                            >
                                This is a required field
                            </label>
                        </div>
                        <div>
                            <p for="minor" className="form-label">
                                3. Current Declared Minor (if none, leave blank)
                            </p>
                            <div class="form-options-div">
                                <input type="text" id="minor" className="form-control"/>
                            </div>
                        </div>
                        <div>
                            <p for="grad-date" class="form-label">
                                4. Expected Graduation Date (semester and year): For undergraduate students in a declared major, this should match your listed graduation date on your DARS and will be verified with the DARS. If your graduation date does not match the date listed on your DARS, your request will be denied. If you do not have a graduation date, you are highly encouraged to apply for your degree before submitting this form:<a href="https://onecampus.vt.edu/task/all/application-for-degree">https://onecampus.vt.edu/task/all/application-for-degree</a>.<strong>*</strong>
                            </p>
                            <div class="form-options-div">
                                <select
                                    id="grad-date"
                                    className="form-select"
                                    required
                                >
                                    <option value="" selected disabled></option>
                                    {calcGradDates().map((gd) => (
                                        <option value={gd[0]}>{gd[1]}</option>
                                    ))}
                                </select>
                            </div>
                            <label
                                for="grad-date"
                                id="grad-date-error"
                                className="feedback hidden"
                            >
                                This is a required field
                            </label>
                        </div>
                        <div>
                            <p for="campus" class="form-label">
                                5. What campus do you attend classes at?<strong>*</strong>
                            </p>
                            <div class="form-options-div">
                                <select
                                    id="campus"
                                    className="form-select"
                                    required
                                >
                                    <option value="" selected disabled></option>
                                    <option value={0}>Blacksburg</option>
                                    <option value={4}>National Capital Region</option>
                                    <option value={10}>Virtual</option>
                                </select>
                            </div>
                            <label
                                for="campus"
                                id="campus-error"
                                className="feedback hidden"
                            >
                                This is a required field
                            </label>
                        </div>


                        
                    </fieldset>
                    <br />
                    <fieldset style={{borderRadius: 0.5+'em'}}>
                        <legend>Class Section Information</legend>
                        <div>
                            <p for="term" className="form-label">
                                6. Select the Term for Force/Add<strong>*</strong>:
                            </p>
                            <div className="form-options-div">
                                <select
                                    id="term"
                                    className="form-select"
                                    //value={term}
                                    onChange={(e) => {
                                        setTerm(e.target.value);
                                        console.log(e.target.value);
                                        fetchCourses(e.target.value);
                                        document.getElementById("course").value="";
                                    }}
                                    required
                                >
                                    <option value="" selected disabled>{terms.length == 0 ? "No Available Terms": "Select One"}</option>
                                    {terms.map((term) => (
                                        <option value={parseInt(term.termcode)}>
                                            { /* Semester */
                                                (term.termcode % 100 == 1)? "Spring" :
                                                (term.termcode % 100 == 9)? "Fall" :
                                                "Summer"
                                            } {parseInt(term.termcode/100) /* Year */} 
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <label
                                for="term"
                                id="term-error"
                                className="feedback hidden"
                            >
                                This is a required field
                            </label>
                        </div>
                        <div>
                            <p class="form-label" for="course">
                                7. Select the Course you wish to Force/Add<strong display="color: red">*</strong>
                            </p>
                            <div className="form-options-div">
                                <select
                                    id="course"
                                    //value={course}
                                    className="form-select"
                                    onChange={(e) => {
                                        setCourse(e.target.value)
                                        fetchSections(e.target.value)
                                        //consentOffice(e.target.value)
                                    }}
                                    //disabled={(term > 0) ? false : true}
                                    required
                                >
                                    <option value="" selected disabled>{courses.length == 0 ? "No Available Courses" : "Select One"}</option>
                                    {courses.map((c) => (
                                    <>
                                        {forceAdds.includes(term+c.course_id) ? (
                                            <option value={c.course_id} disabled>
                                                {c.course_id} {c.course_name}
                                            </option>
                                        ) : (
                                            <option value={c.course_id}>
                                                {c.course_id} {c.course_name}
                                            </option>
                                        )}
                                    </>
                                    ))}
                                </select>
                            </div>
                            <label
                                for="course"
                                id="course-error"
                                className="feedback hidden"
                            >
                                This is a required field
                            </label>
                        </div>
                    </fieldset>
                    <br />
                    <div style={{overflow: "overlay"}}>
                        <table className="table" style={{padding: 0}}>{/* Table of the available Sections */}
                            <thead>
                                <tr>
                                    <th>CRN</th>
                                    <th>Credit Hours</th>
                                    <th>Instructor</th>
                                    <th>Meet Days</th>
                                    <th>Begin Time</th>
                                    <th>End Time</th>
                                    <th>Location</th>
                                    <th>Campus</th>
                                    <th>Current Enrollment</th>
                                    <th>Max Enrollment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sections.map((section) => (
                                    <tr>
                                        <td>{section.crn}</td>
                                        <td>{section.credit_hrs}</td>
                                        <td>{section.instructor}</td>
                                        <td>{section.meet_days}</td>
                                        <td>{section.begin_time}</td>
                                        <td>{section.end_time}</td>
                                        <td>{section.location}</td>
                                        <td>{
                                            (section.campus == 0) ? "Blacksburg" :
                                            (section.campus == 4) ? "NCR" :
                                            "Virtual"
                                        }</td>
                                        <td>{section.current_enrollment}</td>
                                        <td>{section.max_enrollment}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <br />
                    <fieldset style={{borderRadius: 0.5+'em'}}>
                        <legend>Force/Add Choices</legend>
                        <label className="form-label">8. Please choose your top two section choices (You must choose at least one section):</label>
                        <div className="row">
                            <div className="column">
                                <div className="form-options-div">
                                    <label className="form-label" for="first-choice">First Choice Section<strong display="color: red">*</strong></label>
                                    <div className="form-options-div">
                                        <select
                                            id="first-choice"
                                            className="form-select"
                                            value={firstChoice}
                                            onChange={(e) => setFirstChoice(e.target.value)}
                                        >
                                            <option selected value="bad" disabled>Select One</option>
                                            {sections.map((section) => (
                                                <option value={section.crn}>{section.crn}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <label for="first-choice" id="first-error" className="feedback hidden">
                                        You must choose at least one section
                                    </label>
                                </div>
                            </div>
                            <div className="column">
                                <div className="form-options-div">
                                    <label className="form-label" for="second-choice">Second Choice Section</label>
                                    <div className="form-options-div">
                                        <select
                                            id="second-choice"
                                            className="form-select"
                                            value={secondChoice}
                                            onChange={(e) => setSecondChoice(e.target.value)}
                                        >
                                            <option selected value={null}>None</option>
                                            {sections.map((section) => (
                                                <option value={section.crn}>{section.crn}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <p for="dropables" className="form-label">
                                9. I give permission to drop me from the following sections in order to add my above choices. (Please list the sections by CRN separated by commas)
                            </p>
                            <div class="form-options-div">
                                <input type="text" id="dropables" className="form-control" pattern="^\d{5}(,\s*\d{5})*$"/>
                            </div>
                            <label for="dropables" id="dropables-error" className="feedback hidden">
                                Must be empty, of the format "#####", or if multiple CRNS of the format "#####, #####, #####"
                            </label>
                        </div>
                        <div>
                            <p className="form-label" for="reason">
                                10. Please select a reason for needing the Force Add<strong display="color: red">*</strong>
                            </p>
                            <div className="form-options-div">
                                <select id="reason" className="form-select" onChange={(e) => {handleDocumentsUpload(e.target.value);}} required>
                                    <option value={0} selected disabled></option>
                                </select>
                            </div>
                            <label
                                for="reason"
                                id="reason-error"
                                className="feedback hidden"
                            >
                                This is a required field
                            </label>
                        </div>
                        <div id="documents-div" className="hidden">
                            <p className="form-label" for="documents">
                                10b. Please upload a copy of your unofficial transcript or other supporting documentation showing the completed prerequisites<strong display="color: red">*</strong>. (Uploads must be in either pdf, png, or jpeg formats)
                            </p>
                            <div className="form-options-div">
                                <input type="file" className="form-control" id="documents" accept="image/png,image/jpeg,application/pdf" style={{width:'auto'}} onChange={() => {checkFileTypes()}} multiple></input>
                            </div>
                            <label
                                for="documents"
                                id="documents-error"
                                className="feedback hidden"
                            >
                                This is a required field
                            </label>
                            <label
                                for="documents"
                                id="documents-type-error"
                                className="feedback hidden"
                            >
                                Files must be of the format '.pdf', '.png', or '.jpeg'
                            </label>
                        </div>
                        <div>
                            <p for="comments">11. Additional Comments</p>
                            <textarea className="form-control form-textarea" id="comments" maxLength={255} rows={3}></textarea>
                        </div>
                    </fieldset>
                    <br />
                    <fieldset style={{borderRadius: 0.5+'em'}}>
                        <legend>Consent</legend>
                        <ul>
                            <li>I am providing explicit permission for the Virginia Tech, Department of Computer Science to make changes to my enrollment record including adding and dropping courses.</li>
                            <li>If I want to revoke this permission, I must contact the appropriate CS office in writing via email. Undergraduate courses: <a href="mailto:csundergrad@vt.edu">csundergrad@vt.edu</a> & graduate courses: <a href="mailto:gradinfo@cs.vt.edu">gradinfo@cs.vt.edu</a>.</li>
                            <li>I am aware that force/add enrollments will be added (when available) on a first come-first serve basis.</li>
                            <li>I am aware that if I request a course for which I have not met the prerequisites, I will not be enrolled in that course.</li>
                            <li>I understand that seats will not be held while time conflicts, holds and other barriers to enrollment are worked through.</li>
                            <li>Please indicate below if you acknowledge and agree to the above statements.</li>
                        </ul>
                        <div className="form-options-div">
                            <input id="consent" type="checkbox" required/>
                            <label for="consent">I consent<strong display="color: red">*</strong></label>
                        </div>
                        <label
                            for="consent"
                            id="consent-error"
                            className="feedback hidden"
                        >
                            This is a required field
                        </label>
                    </fieldset>
                    <div>
                        <button type="button" className="btn btn-success" onClick={() => handleSubmit()}>Submit</button>
                    </div>
                </form>
            </>
            )}
        </div>
    )
}