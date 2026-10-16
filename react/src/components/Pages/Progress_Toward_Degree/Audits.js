import { useEffect, useState } from "react";
import axios from "axios";

import { statusIsGood } from "../../../helpers/http";
import { Link } from "react-router-dom";
import "../../../css/Audits.scss";
import FileInput from "../../HelperComponents/FileInput";
import { IoEyeOutline, IoFilterOutline, IoHelpCircleOutline } from "react-icons/io5";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { staticDemo, downloadSample, clearLocalAudits, refreshSample } from '../../../staticDemo/client';

const fileTypes = ["XLSX"];

export default function Audits({ user }) {
  const [refetchTrigger, setRefetchTrigger] = useState(false);
  const [job, setJob] = useState(null);
  const [sampleBusy, setSampleBusy] = useState(false);
  const [sampleError, setSampleError] = useState('');
  async function runSample() {
    setSampleBusy(true);
    setSampleError('');
    try {
      if (staticDemo) await refreshSample();
      const form = new FormData();
      for (const kind of ['progress', 'warehouse']) {
        const { data } = await axios.get(`/api/demo/sample/${kind}`, { responseType: 'blob' });
        form.append('files', data, `demo-${kind}.xlsx`);
      }
      await axios.post('/api/audit', form);
      triggerRefetch();
    } catch (error) {
      setSampleError(error.response?.data?.message || 'Unable to start the sample audit. Please try again.');
    } finally {
      setSampleBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    const refresh = () => axios.get('/api/audit/status')
      .then(({ data }) => { if (active) setJob(data); })
      .catch(() => {});
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => { active = false; clearInterval(timer); };
  }, [refetchTrigger]);

  function triggerRefetch() {
    setRefetchTrigger(!refetchTrigger);
  }

  return (
    <div className="audits-container">
      <div className="page-body">
        <h1>Audits</h1>
        {user?.demo && <div style={{ marginBottom: 20 }}>
          <p>{staticDemo ? 'Each run randomly selects 10 students from the provided anonymous workbooks, preserving their original information and complete course histories.' : 'The quick sample contains three fictional students.'} To review all students in your own workbooks, upload both test files below (up to 20 MB each).</p>
          <button className="btn btn-primary" disabled={sampleBusy || ['queued', 'processing'].includes(job?.status)} onClick={runSample}>
            {sampleBusy ? 'Starting sample…' : staticDemo ? 'Run random 10-student sample' : 'Run 3-student sample'}
          </button>
          <p style={{ marginTop: 10 }}>Sample files: <a href="/api/demo/sample/progress" onClick={staticDemo ? event => { event.preventDefault(); downloadSample('progress').catch(error => setSampleError(error.message)); } : undefined}>Progress Towards Degree</a> · <a href="/api/demo/sample/warehouse" onClick={staticDemo ? event => { event.preventDefault(); downloadSample('warehouse').catch(error => setSampleError(error.message)); } : undefined}>Data Warehouse</a></p>
          {staticDemo && <>
            <p>Your files stay on this device. Large files may take longer on phones or older computers. Only the latest three audits are retained.</p>
            <button className="btn btn-outline-secondary" disabled={sampleBusy || job?.status === 'processing'} onClick={async () => {
              try { await clearLocalAudits(); triggerRefetch(); } catch (error) { setSampleError(error.message); }
            }}>Clear saved demo results</button>
          </>}
        </div>}
        {sampleError && <Alert severity="error">{sampleError}</Alert>}
        {job?.status === 'failed' && <Alert severity="error">{job.message}</Alert>}
        {['queued', 'processing'].includes(job?.status) && <Alert severity="info">Your audit is {job.status}. Results will refresh automatically.</Alert>}
        <div className="audits-split">
          <AuditImport trigger={triggerRefetch} />
          <AuditExport refetchTrigger={refetchTrigger} user={user} />
        </div>
        <UsageDocs />
      </div>
    </div>
  );
}

function AuditImport({ trigger }) {
  // Progress Towards Degree Data
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  // 0 = simple message, 1 = warning, 2 = error, 3 = success
  const [errorSeverity, setErrorSeverity] = useState("");
  const [error, setError] = useState(null);
  // Filter options
  const [advisorLname, setAdvisorLname] = useState("");
  const [concentrations, setConcentrations] = useState([]);
  const [gradTerms, setGradTerms] = useState("");
  const [concentrationDropdownOpen, setConcentrationDropdownOpen] = useState(false);

  const [open, setOpen] = useState(false);

  // Data Warehouse Data
  const [fullDataFile, setFullDataFile] = useState(null);
  const [fullDataError] = useState(null);

  function displayMessage(message, errorSeverity) {
    setError(message);
    setErrorSeverity(errorSeverity);
  }

  function handleChange(files) {
    if (files && files.length > 0) {
      const selectedFile = files[0];
      const fileExtension = selectedFile.name.split(".").pop().toUpperCase();

      if (!fileTypes.includes(fileExtension)) {
        displayMessage("File uploaded was not XLSX!", 2);
        return;
      }

      setFile(selectedFile);
      displayMessage(null);
    } else {
      setFile(null);
      displayMessage("No file selected", 2);
    }
  }

  function handleFullDataChange(files) {
    if (files && files.length > 0) {
      const selectedFile = files[0];
      const fileExtension = selectedFile.name.split(".").pop().toUpperCase();

      if (!fileTypes.includes(fileExtension)) {
        displayMessage("File uploaded was not XLSX!", 2);
        return;
      }

      setFullDataFile(selectedFile);
      displayMessage(null);
    } else {
      setFullDataFile(null);
      displayMessage("No file selected", 2);
    }
  }

  function handleConcentrationChange(e) {
    const value = e.target.value;

    setConcentrations((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  const toggleConcentrationDropdown = () => {
    setConcentrationDropdownOpen(!concentrationDropdownOpen);
  };

  async function handleUpload() {
    if (!file) {
      displayMessage("Please upload a Progress Towards Degree file.", "error");
      return;
    }

    if (!fullDataFile) {
      displayMessage(
        "Please upload a Full Data From Data Warehouse file.",
        "error"
      );
      return;
    }

    setLoading(true);
    displayMessage(null, null);

    const formData = new FormData();
    formData.append("files", file ?? {});
    formData.append("files", fullDataFile ?? {});

    // NEW FILTER FIELDS — backend already expects them
    formData.append("advisor_lname", advisorLname || "ALL");
    formData.append(
      "concentrations",
      concentrations.length > 0 ? concentrations.join(",") : "ALL"
    );
    formData.append("grad_terms", gradTerms || "ALL");

    await axios
      .post("/api/audit", formData)
      .then(() => {
        displayMessage("Processing Audit! Please check back soon.", "warning");
        setOpen(true);
        setLoading(false);
        // Delay trigger to ensure DB is updated
        setTimeout(() => trigger(), 500);
        setFile(null);
        setFullDataFile(null);
      })
      .catch((error) => {
        setOpen(true);
        setLoading(false);
        setFile(null);
        setFullDataFile(null);

        const errorMessage = error.response?.data?.message || "The upload could not be completed. Please try again.";

        console.log(errorMessage);

        if (
          errorMessage.includes(
            "Cannot read properties of undefined (reading 'map')"
          )
        ) {
          displayMessage(`Incomplete Checksheet`, "error");
        } else {
          displayMessage(errorMessage, "error");
        }
      });
  }

  function onTypeError(err) {
    displayMessage(
      "Invalid file type. Please upload an .xlsx (Excel) file.",
      "error"
    );
    setFile(null);
  }

  function onSizeError(file) {
    displayMessage(`File size error for ${file.name}.`, "error");
    setFile(null);
  }

  const handleClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }

    setOpen(false);
  };

  return (
    <div>
      <Snackbar open={open} autoHideDuration={8000} onClose={handleClose}>
        <Alert
          onClose={handleClose}
          severity={errorSeverity}
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>
      <h2>Import</h2>
      <h3>Progress Towards Degree:</h3>
      <div className="file-uploader">
        <FileInput
          file={file}
          fileTypes={fileTypes}
          handleChange={handleChange}
          errorMsg={error}
          onSizeError={onSizeError}
          onTypeError={onTypeError}
          clearFile={() => {
            setFile(null);
            displayMessage(null);
          }}
        />
      </div>
      <h3>Full Data From Data Warehouse:</h3>
      <div className="file-uploader">
        <FileInput
          file={fullDataFile}
          fileTypes={fileTypes}
          handleChange={handleFullDataChange}
          errorMsg={fullDataError}
          onSizeError={onSizeError}
          onTypeError={onTypeError}
          clearFile={() => {
            setFullDataFile(null);
            displayMessage(null);
          }}
        />
      </div>
      <h3>Optional Filters</h3>
      <div className="audit-filter-controls" style={{ maxWidth: '500px' }}>
        <div className="filter-row">
          <div className="search-bar" style={{ flexDirection: 'column', alignItems: 'flex-start', maxWidth: '480px' }}>
            <label style={{ marginBottom: '5px', fontWeight: 'bold' }}>Advisor's Last Name:</label>
            <input
              type="text"
              placeholder='e.g. "Smith" or leave blank for ALL'
              value={advisorLname}
              onChange={(e) => setAdvisorLname(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-row">
          <div className="search-bar" style={{ flexDirection: 'column', alignItems: 'flex-start', maxWidth: '480px' }}>
            <label style={{ marginBottom: '5px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
              Graduation Terms (comma-separated):
              <span 
                className="tooltip-container"
                style={{ 
                  cursor: 'help', 
                  display: 'inline-flex', 
                  alignItems: 'center',
                  color: '#007bff',
                  position: 'relative'
                }}
              >
                <IoHelpCircleOutline size={16} />
                <span className="tooltip-text" style={{
                  visibility: 'hidden',
                  backgroundColor: '#333',
                  color: '#fff',
                  textAlign: 'left',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  position: 'absolute',
                  zIndex: 1000,
                  bottom: '125%',
                  left: '50%',
                  marginLeft: '-80px',
                  width: '160px',
                  fontSize: '12px',
                  lineHeight: '1.4',
                  whiteSpace: 'pre-line',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  fontWeight: 'normal'
                }}>
                  {`Example:
Spring 2025 = 202501
Fall 2025 = 202509
Summer 2025 = 202506`}
                </span>
              </span>
            </label>
            <input
              type="text"
              value={gradTerms}
              onChange={(e) => setGradTerms(e.target.value)}
              placeholder='e.g. "202501" or leave blank for ALL'
            />
          </div>
        </div>

        <div className="filter-row">
          <div className="dropdown-wrapper">
            <button className="filter-button" onClick={toggleConcentrationDropdown}>
              <IoFilterOutline /> Filter by Concentrations
            </button>
            {concentrationDropdownOpen && (
              <div className="dropdown-content">
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="cs-major"
                    value="CS"
                    checked={concentrations.includes("CS")}
                    onChange={handleConcentrationChange}
                  />
                  <label htmlFor="cs-major">Computer Science Major</label>
                </div>
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="dcc-conc"
                    value="DCC"
                    checked={concentrations.includes("DCC")}
                    onChange={handleConcentrationChange}
                  />
                  <label htmlFor="dcc-conc">Data-Centric Computing Concentration</label>
                </div>
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="sc-conc"
                    value="SC"
                    checked={concentrations.includes("SC")}
                    onChange={handleConcentrationChange}
                  />
                  <label htmlFor="sc-conc">Secure Computing Concentration</label>
                </div>
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    id="cs-minor"
                    value="MIN"
                    checked={concentrations.includes("MIN")}
                    onChange={handleConcentrationChange}
                  />
                  <label htmlFor="cs-minor">CS Minor</label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <p>
        Processing time varies based on file size and queue size.
        With smaller files and shorter queue sizes your page should automatically refresh and show your processed audit.
        If not please wait a few minutes and refresh the page manually.
        If after 5 or more minutes you still do not see your audit listed, please contact <a href="mailto:bbradner@vt.edu">bbradner@vt.edu</a> for technical support.
      </p>
      <button
        className="form-btn"
        onClick={handleUpload}
        disabled={loading || (!file && !fullDataFile)}
      >
        {loading ? (
          <>
            <div className="spinner-border" role="status"></div>
            Submitting for Processing, please wait...
          </>
        ) : (
          "Click to Upload"
        )}
      </button>
    </div>
  );
}

function AuditExport({ refetchTrigger, importInfo, user }) {
  const [auditHistory, setAuditHistory] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [allAudits, setAllAudits] = useState([]);

  // Filter states
  const [searchInput, setSearchInput] = useState("");
  const [submitterFilter, setSubmitterFilter] = useState({});
  const [incompleteOnlyFilter, setIncompleteOnlyFilter] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [submitters, setSubmitters] = useState([]);
  const [studentCountFilter, setStudentCountFilter] = useState("all");

  const isProcessing = importInfo?.isProcessing || false;
  const initiatingUser = importInfo?.info?.initiatingUser || null;

  function dateToString(date) {
    const year = date.getFullYear().toString().padStart(4, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hour = date.getHours().toString().padStart(2, "0");
    const min = date.getMinutes().toString().padStart(2, "0");
    const sec = date.getSeconds().toString().padStart(2, "0");
    return `${year}${month}${day}-${hour}${min}${sec}`;
  }

  function downloadAudit(audit_id) {
    setDownloading(true);
    axios
      .get(`/api/audit-file/${audit_id}`, {
        responseType: "blob",
        params: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));

        // Find the specific audit's timestamp
        const audit = auditHistory.find((a) => a.audit_id === audit_id);
        const auditDate = audit?.timestamp
          ? new Date(audit.timestamp)
          : new Date(Date.now());

        // Download file
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `ptd-export-${dateToString(auditDate)}.xlsx`
        );
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      })
      .catch((err) => {
        if (err?.isAxiosError) {
          const errMsg = err?.response?.data?.message || null;
          alert(
            `Error exporting/downloading the last audit${
              errMsg ? `: ${errMsg}` : ". Please try again."
            }`
          );
        } else {
          console.error("Error downloading last audit:", err);
          alert("Error downloading the last audit. Please try again.");
        }
      })
      .finally(() => setDownloading(false));
  }

  function getAuditHistory(pid) {
    axios
      .get(`/api/audit/history/${pid}`)
      .then((response) => {
        if (statusIsGood(response?.status)) {
          const audits = response?.data?.history || [];
          setAllAudits(audits);

          // Extract unique submitters
          const uniqueSubmitters = [
            ...new Set(audits.map((a) => a.initiating_user_pid || "N/A")),
          ].sort();
          setSubmitters(uniqueSubmitters);

          // Initialize submitter filter
          const initialFilter = {};
          uniqueSubmitters.forEach((submitter) => {
            if(submitter == user.pid)
              initialFilter[submitter] = true;
            else
              initialFilter[submitter] = false;
            //initialFilter[submitter] = true;
          });
          setSubmitterFilter(initialFilter);

          setAuditHistory(audits);
        } else {
          console.error(
            "Error getting audit history:",
            response?.body?.message
          );
          setAuditHistory([]);
          setAllAudits([]);
        }
      })
      .catch((err) => {
        console.error("Error getting audit history: ", err);
        setAuditHistory([]);
        setAllAudits([]);
      });
  }

  /**
   * Helper function to format a number of milliseconds into a human-readable
   * time duration
   */
  function formatMs(ms) {
    let sec = Math.floor(ms / 1000);
    if (sec > 0) {
      ms %= 1000;

      let min = Math.floor(sec / 60);
      if (min > 0) {
        sec %= 60;

        let hr = Math.floor(min / 60);
        if (hr > 0) {
          min %= 60;
          return `${hr}h ${min}min ${sec}s`;
        } else {
          return `${min}min ${sec}s`;
        }
      } else {
        if (ms === 0) {
          return `${sec}s`;
        } else {
          return `${sec}s ${ms}ms`;
        }
      }
    } else {
      return `${ms}ms`;
    }
  }

  useEffect(() => {
    getAuditHistory(user.pid);
    const timer = setInterval(() => getAuditHistory(user.pid), 5000);
    return () => clearInterval(timer);
  }, [refetchTrigger, user.pid]);

  // Apply filters
  useEffect(() => {
    if (allAudits.length === 0) return;

    let filtered = allAudits.filter((audit) => {
      // Filter by submitter
      const submitterName = audit.initiating_user_pid || "N/A";
      if (!submitterFilter[submitterName]) return false;

      // Filter by students with incomplete degrees only
      if (incompleteOnlyFilter && audit.num_students_behind_checksheet === 0)
        return false;

      // Filter by search (audit ID or filename)
      if (searchInput) {
        const searchLower = searchInput.toLowerCase();
        const matchesId = audit.audit_id?.toString().includes(searchInput);
        const matchesFilename = audit.filename
          ?.toLowerCase()
          .includes(searchLower);

        if (!matchesId && !matchesFilename) return false;
      }

      // Filter by date range
      if (dateFrom) {
        const auditDate = new Date(audit.timestamp);
        const fromDate = new Date(dateFrom);
        if (auditDate < fromDate) return false;
      }

      if (dateTo) {
        const auditDate = new Date(audit.timestamp);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // Include the entire day
        if (auditDate > toDate) return false;
      }

      // Filter by student count
      if (studentCountFilter !== "all") {
        const numStudents = audit.num_students || 0;

        switch (studentCountFilter) {
          case "10":
            if (numStudents > 10) return false;
            break;
          case "20":
            if (numStudents > 20) return false;
            break;
          case "50":
            if (numStudents > 50) return false;
            break;
          case "100":
            if (numStudents > 100) return false;
            break;
          default:
            break;
        }
      }

      return true;
    });

    setAuditHistory(filtered);
  }, [
    allAudits,
    submitterFilter,
    incompleteOnlyFilter,
    searchInput,
    dateFrom,
    dateTo,
    studentCountFilter,
  ]);

  const handleSubmitterFilterChange = (submitter) => {
    setSubmitterFilter((prev) => ({
      ...prev,
      [submitter]: !prev[submitter],
    }));
  };

  const handleIncompleteOnlyChange = () => {
    setIncompleteOnlyFilter(!incompleteOnlyFilter);
  };

  const handleSearchChange = (event) => {
    setSearchInput(event.target.value);
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const clearFilters = () => {
    setSearchInput("");
    setIncompleteOnlyFilter(false);
    setDateFrom("");
    setDateTo("");
    setStudentCountFilter("all");

    // Reset submitter filter to all selected
    const resetFilter = {};
    submitters.forEach((submitter) => {
      resetFilter[submitter] = true;
    });
    setSubmitterFilter(resetFilter);
  };

  const hasAuditHistory = auditHistory?.length > 0;

  return (
    <div>
      <h3>Audit history</h3>

      {/* Filter Controls */}
      <div className="audit-filter-controls">
        <div className="filter-row">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search by Audit ID or filename..."
              value={searchInput}
              onChange={handleSearchChange}
            />
          </div>

          <div className="date-filters">
            <label>
              From:
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </label>
            <label>
              To:
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="filter-row">
          {/* Not currently implemented, checkbox for showing only audits with incomplete degrees
          <div className="checkbox-container">
            <input
              type="checkbox"
              id="incompleteOnly"
              checked={incompleteOnlyFilter}
              onChange={handleIncompleteOnlyChange}
            />
            <label htmlFor="incompleteOnly">
              Show only audits with incomplete degrees
            </label>
          </div> */}

          <div className="student-count-filter">
            <label htmlFor="studentCount">Max Students:</label>
            <select
              id="studentCount"
              value={studentCountFilter}
              onChange={(e) => setStudentCountFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          {/* Filter by Submitter - removed as audit sharing is not currently implemented  */}
          <div className="dropdown-wrapper">
            <button className="filter-button" onClick={toggleDropdown}>
              <IoFilterOutline /> Filter by Submitter
            </button>
            {dropdownOpen && (
              <div className="dropdown-content">
                {submitters.map((submitter) => (
                  <div key={submitter} className="checkbox-item">
                    <input
                      type="checkbox"
                      id={`submitter-${submitter}`}
                      checked={submitterFilter[submitter] || false}
                      onChange={() => handleSubmitterFilterChange(submitter)}
                    />
                    <label htmlFor={`submitter-${submitter}`}>
                      {submitter}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="clear-filters-btn" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      {allAudits.length === 0 ? (
        <label>No audit history.</label>
      ) : hasAuditHistory ? (
        <>
          <div className="audit-summary">
            Showing {auditHistory.length} of {allAudits.length} audits
          </div>
          <div className="audit-history">
            <table>
              <thead>
                <tr>
                  <th>Audit ID</th>
                  <th>Submitted by</th>
                  <th>Submitted on</th>
                  <th>File name</th>
                  <th>Processing time</th>
                  <th>Students Processed</th>
                  <th>View</th>
                  <th>Download</th>
                </tr>
              </thead>
              <tbody>
                {isProcessing && (
                  <tr>
                    <td>{initiatingUser || "N/A"}</td>
                    <td>Processing...</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                )}
                {auditHistory.map(
                  (
                    {
                      audit_id,
                      initiating_user_pid,
                      timestamp,
                      filename,
                      processing_time_ms,
                      num_students,
                      num_incomplete_degree_students,
                    },
                    index
                  ) => (
                    <tr key={index}>
                      <td>{audit_id}</td>
                      <td>{initiating_user_pid || "N/A"}</td>
                      <td>{new Date(timestamp).toLocaleString()}</td>
                      <td>{filename}</td>
                      <td>{processing_time_ms < 0 ? "-" : formatMs(processing_time_ms)}</td>
                      <td>{num_students < 0 ? "-" : `${num_students}`}</td>
                      <td>
                        <Link to={`/audit/${audit_id}`}>
                          <IoEyeOutline title="View audit information" />
                        </Link>
                      </td>
                      <td>
                        <button
                          className="form-btn"
                          onClick={() => downloadAudit(audit_id)}
                          disabled={
                            !hasAuditHistory || downloading || isProcessing
                          }
                        >
                          {downloading ? (
                            <>
                              <div
                                className="spinner-border"
                                role="status"
                              ></div>
                              Processing, please wait...
                            </>
                          ) : (
                            "Download audit"
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <label>
          No audits match the current filters. Try adjusting your filter
          criteria.
        </label>
      )}
    </div>
  );
}

function UsageDocs() {
  return (
    <div className="audit-docs">
      <h2>Import File Formats</h2>
      <p>
        This tool requires the import of two <strong>.xlsx</strong>
        files that you import must be of specific formats.
        <blockquote>
          Files that come directly from the Progress Toward Degree tool and Data
          Warehouse should work fine.
        </blockquote>
      </p>
      <h4>Progress Towards Degree File</h4>
      <p>
        All information to be included in the audit should be stored in the
        first tab of the spreadsheet. Each row, except for the first, represents
        a course a student has taken during a semester. The first row is a
        header that describes the information stored in its column. While cells
        may be blank, the import must have the following headers at a minimum:
      </p>
      <ul>
        <li>
          <strong>ID</strong>: The 90* ID number of the student taking the
          course in the row.
        </li>
        <li>
          <strong>name</strong>: The name of the student.
        </li>
        <li>
          <strong>admit_term</strong>: The semester the student was admitted. It
          is represented as a number formed with the year and the month of the
          semester (i.e. Fall 2022 is 202209, Spring 2023 is 202301, etc.)
        </li>
        <li>
          <strong>advisor_last_name</strong>: The last name of the student's
          advisor.
        </li>
        <li>
          <strong>standing_message</strong>: The standing message for the
          student's current semester.
        </li>
        <li>
          <strong>conc</strong>: The concentration (focus) of the student within
          CS. If left blank, defaults to "CS".
        </li>
        <li>
          <strong>overall_hrs_attempted</strong>: The total number of hours
          attempted by the student.
        </li>
        <li>
          <strong>overall_gpa</strong>: The overall GPA of the student.
        </li>
        <li>
          <strong>transfer_hrs_earned</strong>: The total number of transfer
          hours earned by the student.
        </li>
        <li>
          <strong>subj_expanded</strong>: The subject of the course in this row
          (CS, MATH, etc.).
        </li>
        <li>
          <strong>crse_numb</strong>: The course number of the course in this
          row.
        </li>
        <li>
          <strong>term_taken</strong>: The course number of the course in this
          row.
        </li>
        <li>
          <strong>credit_hours</strong>: The number of credit hours the course
          counts for.
        </li>
        <li>
          <strong>grade</strong>: The grade earned by the student for this
          course in that semester.
        </li>
      </ul>
      <h4>Data Warehouse File</h4>
      <p>
        All information to be included in the audit should be stored in the
        first tab of the spreadsheet. Each row, except for the first, represents
        a student. The first row is a header that describes the information
        stored in its column. While cells may be blank, the import must have the
        following headers at a minimum:
      </p>
      <ul>
        <li>
          <strong>STUDENT ID</strong>: The 90* ID number of the student taking
          the course in the row.
        </li>
        <li>
          <strong>COMPLETION TERM CODE</strong>: Code indicating graduation time
          of student.
        </li>
        <li>
          <strong>EMAIL ADDRESS</strong>: The email address of the student.
        </li>
      </ul>
      <p>
        Upon uploading the files, you and any other advisors logged into the
        site will be able to see the analyzed information and export a
        corresponding <strong>.xlsx</strong> file for the most recent audit.
      </p>
      <h2>Export File Format</h2>
      <p>
        The <strong>.xlsx</strong> file that you receive on export contains all
        of the analyzed information from the last audit. Similarly to the import
        file, student and course information are shown in each row of the
        spreadsheet. The exported file will note classes a student has not
        completed that are required for graduation as determined by the
        checksheet. Additionally, the file will show any flags associated with
        each student/course that indicate a Policy 91 violation (or it shows a
        warning if a student is close to being in violation).
      </p>
      <p>
        There are four types of violations, as defined by the expectations of
        the Satisfactory Progress Toward Degree section of the CS checksheet:
      </p>
      <ol>
        <li>
          <strong>Student's in-major GPA is less than 2.0</strong>
        </li>
        <ul>
          <li>
            Denoted in the export file with highlighting on a student's in-major
            GPA
          </li>
        </ul>
        <li>
          <strong>
            Student is not taking a 3-credit course required for their major in
            their current semester
          </strong>
        </li>
        <ul>
          <li>
            Denoted with highlighting on all courses in a student's current
            semester
          </li>
        </ul>
        <li>
          <strong>
            Student has repeated a required CS course more than twice
          </strong>
        </li>
        <ul>
          <li>
            Denoted with a highlighted message in the "Flag" column next to
            their most recent repeat of the course.
          </li>
          <li>
            Warnings for a third repeat will also appear next to the course's
            most recent repeat.
          </li>
        </ul>
        <li>
          <strong>
            Student has repeated more than three required CS courses
          </strong>
        </li>
        <ul>
          <li>
            Denoted with a message in the "Flag" column next to the most recent
            repeat of each repeated course.
          </li>
          <li>
            {" "}
            Warnings for this violation will appear next to any courses that
            will need a third repeat.
          </li>
        </ul>
      </ol>
      <p>
        The first tab in the spreadsheet includes all students who were included
        in the input file for analysis. Each successive tab contains the same
        data, but each tab is labeled and filtered to only include students for
        each individual advisor.
      </p>
    </div>
  );
}
