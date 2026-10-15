import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { IoArrowBack } from "react-icons/io5";
import "../../../css/StudentPage.scss";

const StudentProgressPage = () => {
  const { audit_id, student_id } = useParams();
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatTerm = (term, nextToNumber = true) => {
    if (!term) return nextToNumber ? "" : "N/A";

    const year = Math.floor(term / 100);
    const termNum = term % 100;
    let result;

    switch (termNum) {
      case 9:
        result = `Fall ${year}`;
        break;
      case 1:
        result = `Spring ${year}`;
        break;
      case 6:
        result = `Summer ${year}`;
        break;
      default:
        result = "";
    }

    if (nextToNumber) {
      return result !== "" ? ` (${result})` : "";
    } else {
      return result !== "" ? result : `${term}`;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all students from this audit
        const auditResponse = await axios.get(`/api/audit/${audit_id}`);
        const students = auditResponse.data;

        // Find the specific student
        const studentData = students.find((s) => s.id === parseInt(student_id));

        if (studentData) {
          setStudent(studentData);

          // Parse missing courses from JSON if needed
          if (studentData.missing_courses) {
            try {
              const missingCourses =
                typeof studentData.missing_courses === "string"
                  ? JSON.parse(studentData.missing_courses)
                  : studentData.missing_courses;
              setCourses(missingCourses || []);
            } catch (err) {
              console.error("Error parsing missing courses:", err);
              setCourses([]);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching student data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [audit_id, student_id]);

  let tableCourseTerm = null;
  let tableCourseRowOddColor = true;

  return (
    <div className="page-body">
      <div className="back-button">
        <Link to={`/audit/${audit_id}`}>
          <IoArrowBack /> Back to Audit {audit_id}
        </Link>
      </div>

      <h1>
        Student Progress: <span className="student-name">{student?.name}</span>
      </h1>

      <div className="content-container">
        <div className="info-wrapper">
          <div className="box">
            <h2>Basic Information</h2>
            {loading ? (
              <div>Loading student information...</div>
            ) : (
              <>
                <div>
                  <strong>Name:</strong> {student?.name}
                </div>
                <div>
                  <strong>Student ID:</strong> {student?.id}
                </div>
                <div>
                  <strong>Email:</strong> {student?.email || "N/A"}
                </div>
                <div>
                  <strong>Advisor Last Name:</strong>{" "}
                  {student?.advisor_lname || "(Unassigned)"}
                </div>
                <div>
                  <strong>Concentration:</strong>{" "}
                  {student?.concentration || "CS"}
                </div>
                <div>
                  <strong>Student Class:</strong> {student?.student_class_desc}
                </div>
                <div>
                  <strong>Citizen Code:</strong> {student?.citizen_code}
                </div>
                <div>
                  {student?.transfer_flag
                    ? "Transfer student"
                    : "Not a transfer student"}
                </div>
                <div>{student?.cadet_flag ? "Cadet" : "Not a cadet"}</div>
                <div>
                  {student?.self_reported_veteran_flag
                    ? "Veteran"
                    : "Not a Veteran"}
                </div>
                <div>
                  <strong>Graduation Status:</strong>{" "}
                  <span
                    className={
                      student?.graduation_ready
                        ? "status-ready"
                        : "status-incomplete"
                    }
                  >
                    {student?.graduation_ready
                      ? "On Track to Graduate"
                      : "Not On Track to Graduate"}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="box">
            <h2>Academic Details</h2>
            {loading ? (
              <div>Loading details...</div>
            ) : (
              <>
                <div>
                  <strong>Admit Term:</strong>{" "}
                  {formatTerm(student?.admit_term, false)}
                </div>
                <div>
                  <strong>Current Term:</strong>{" "}
                  {formatTerm(student?.current_term, false)}
                </div>
                <div>
                  <strong>Expected Graduation Term:</strong>{" "}
                  {formatTerm(student?.completion_term_code, false)}
                </div>
                <div>
                  <strong>Standing Message:</strong>{" "}
                  {student?.standing_message || "N/A"}
                </div>
                <div>
                  <strong>Overall GPA:</strong>{" "}
                  {student?.overall_gpa
                    ? student.overall_gpa.toFixed(2)
                    : "N/A"}
                </div>
                <div>
                  <strong>In Major GPA:</strong>{" "}
                  {student?.in_major_gpa
                    ? student.in_major_gpa.toFixed(2)
                    : "N/A"}
                </div>
                <div>
                  <strong>Overall Hours Attempted:</strong>{" "}
                  {student?.overall_hours_attempted || 0}
                </div>
                <div>
                  <strong>Transfer Hours Earned:</strong>{" "}
                  {student?.transfer_hours_earned || 0}
                </div>
                <div>
                  <strong>Hours to 123:</strong>{" "}
                  {student?.overall_hours_attempted
                    ? Math.max(0, 123 - student.overall_hours_attempted - student?.transfer_hours_earned)
                    : 123}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="courses-section">
          <div className="box">
            <h2>Missing Courses for Graduation</h2>
            {loading ? (
              <div>Loading course information...</div>
            ) : (
              <>
                {!courses || courses.length === 0 ? (
                  <div className="success-message">
                    <strong>✓ Student has completed or is currently enrolled in all required courses!</strong>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Course</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courses.map((course, index) => {
                          return (
                            <tr
                              key={index}
                              className={
                                tableCourseRowOddColor ? "odd" : "even"
                              }
                            >
                              <td>{course}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <div className="course-summary">
                      <strong>Total Missing Courses: {courses.length}</strong>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProgressPage;
