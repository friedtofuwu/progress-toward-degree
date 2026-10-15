import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import {
  IoEyeOutline,
  IoArrowBack,
  IoSettingsOutline,
  IoCaretUp,
  IoCaretDown,
} from "react-icons/io5";
import PaginationComponent from "../Pagination";
import "../../../css/Students.scss";

export default function StudentsList() {
  const { audit_id } = useParams();
  const [students, setStudents] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [studentsPerPage, setStudentsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [allStudents, setAllStudents] = useState([]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showMissingClassesDropdown, setShowMissingClassesDropdown] =
    useState(false);
  const [showConcentrationDropdown, setShowConcentrationDropdown] =
    useState(false);
  const [showPathwaysDropdown, setShowPathwaysDropdown] = useState(false);

  // Store course lists for categories by year
  const [categoryCourses, setCategoryCourses] = useState({});

  // Sorting state
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: null,
  });

  // Column visibility states
  const [visibleColumns, setVisibleColumns] = useState(() => {
    // Try to load from sessionStorage first
    const saved = sessionStorage.getItem(`audit_${audit_id}_visibleColumns`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // If parsing fails, use defaults
      }
    }
    // Default values
    return {
      studentId: true,
      name: true,
      email: true,
      advisor: true,
      concentrationMajor: true,
      currentTerm: true,
      graduationTerm: true,
      overallGpa: true,
      inMajorGpa: true,
      status: true,
      citizenship: false,
      transfer: false,
      cadet: false,
      year: false,
      veteran: false,
      missingClasses: false,
    };
  });

  // Save column visibility to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem(`audit_${audit_id}_visibleColumns`, JSON.stringify(visibleColumns));
  }, [visibleColumns, audit_id]);

  // Column-specific filter states
  const [columnFilters, setColumnFilters] = useState({
    studentId: "",
    name: "",
    email: "",
    advisor: "",
    concentrationMajor: "",
    currentTerm: "",
    graduationTerm: "",
    overallGpa: "",
    inMajorGpa: "",
    status: "",
    citizenship: "",
    transfer: "",
    cadet: "",
    year: "",
    veteran: "",
    missingClasses: {
      core: false,
      cs3xxx: false,
      cs45xxx: false,
      technical: false,
      writing: false,
      communications: false,
    },
    pathways: {
      concept1: false,
      concept2: false,
      concept3: false,
      concept4: false,
      concept5: false,
      concept6: false,
    },
    concentration: {
      csSpecific: false,
      csStatistics: false,
      csTheory: false,
      csCapstone: false,
      dccSpecific: false,
      dccStatistics: false,
      dccElectives: false,
      dccCapstone: false,
      secureSpecific: false,
      secureStatistics: false,
      secureElectives: false,
      secureCapstone: false,
      minorCore: false,
      minorElective: false,
    },
  });

  const formatTerm = (term) => {
    if (!term) return "N/A";
    const year = Math.floor(term / 100);
    const termNum = term % 100;

    switch (termNum) {
      case 9:
        return `Fall ${year}`;
      case 1:
        return `Spring ${year}`;
      case 6:
        return `Summer ${year}`;
      default:
        return `${term}`;
    }
  };

  // Helper function to convert admit_term to academic year (matches backend logic)
  const getAcademicYear = (admitTerm) => {
    const year = Math.floor(admitTerm / 100);
    const termNum = admitTerm % 100;

    // Fall semester (09) starts new academic year
    if (termNum === 9) {
      return year;
    }
    // Spring (01) and Summer (06) are part of previous academic year
    return year - 1;
  };

  // Fetch category courses for filtering
  useEffect(() => {
    const fetchCategoryCourses = async () => {
      if (allStudents.length === 0) return;

      // Get unique years from all students
      const years = [
        ...new Set(allStudents.map((s) => getAcademicYear(s.admit_term))),
      ];

      const newCategoryCourses = {};

      for (const year of years) {
        try {
          // Fetch CS Core, CS Specific, DCC (data-centric), Secure, CS Minor Core, and CS Minor Math courses for this year
          const [coreResponse, csResponse, dccResponse, secureResponse, minorCoreResponse] =
            await Promise.all([
              axios.get(`/api/checksheet/categories/${year}/core`),
              axios.get(`/api/checksheet/categories/${year}/cs`),
              axios.get(`/api/checksheet/categories/${year}/data-centric`),
              axios.get(`/api/checksheet/categories/${year}/secure`),
              axios.get(`/api/checksheet/categories/${year}/cs-minor-core`),
            ]);

          if (!newCategoryCourses[year]) {
            newCategoryCourses[year] = {};
          }

          newCategoryCourses[year].core = coreResponse.data || [];
          newCategoryCourses[year].cs = csResponse.data || [];
          newCategoryCourses[year].dcc = dccResponse.data || [];
          newCategoryCourses[year].secure = secureResponse.data || [];
          newCategoryCourses[year].minorCore = minorCoreResponse.data || [];
        } catch (error) {
          console.error(
            `Error fetching category courses for year ${year}:`,
            error
          );
          // Set empty arrays if fetch fails
          newCategoryCourses[year] = { core: [], cs: [], dcc: [], secure: [], minorCore: []};
        }
      }

      setCategoryCourses(newCategoryCourses);
    };

    fetchCategoryCourses();
  }, [allStudents]);

  // Fetch audit info and students
  useEffect(() => {
    const fetchAuditData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/audit/${audit_id}`);

        if (response.data) {
          setAllStudents(response.data);
        }
      } catch (error) {
        console.error("Error fetching audit data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditData();
  }, [audit_id]);

  // Filter and paginate students
  useEffect(() => {
    if (allStudents.length === 0) return;

    let filtered = allStudents.filter((student) => {
      // Column-specific filters
      if (
        columnFilters.studentId &&
        !student.id?.toString().includes(columnFilters.studentId)
      ) {
        return false;
      }

      if (
        columnFilters.name &&
        !student.name?.toLowerCase().includes(columnFilters.name.toLowerCase())
      ) {
        return false;
      }

      if (
        columnFilters.email &&
        !student.email
          ?.toLowerCase()
          .includes(columnFilters.email.toLowerCase())
      ) {
        return false;
      }

      const advisorName = student.advisor_lname || "(Unassigned)";
      if (
        columnFilters.advisor &&
        !advisorName.toLowerCase().includes(columnFilters.advisor.toLowerCase())
      ) {
        return false;
      }

      const concentrationMajor = student.concentration;
      if (
        columnFilters.concentrationMajor &&
        !concentrationMajor.toLowerCase().includes(columnFilters.concentrationMajor.toLowerCase())
      ) {
        return false;
      }

      if (
        columnFilters.currentTerm &&
        !formatTerm(student.current_term)
          .toLowerCase()
          .includes(columnFilters.currentTerm.toLowerCase())
      ) {
        return false;
      }

      if (
        columnFilters.graduationTerm &&
        !formatTerm(student.completion_term_code)
          .toLowerCase()
          .includes(columnFilters.graduationTerm.toLowerCase())
      ) {
        return false;
      }

      if (columnFilters.overallGpa) {
        const gpaStr = student.overall_gpa
          ? student.overall_gpa.toFixed(2)
          : "N/A";
        if (!gpaStr.includes(columnFilters.overallGpa)) {
          return false;
        }
      }

      if (columnFilters.inMajorGpa) {
        const gpaStr = student.in_major_gpa
          ? student.in_major_gpa.toFixed(2)
          : "N/A";
        if (!gpaStr.includes(columnFilters.inMajorGpa)) {
          return false;
        }
      }

      if (columnFilters.status && columnFilters.status !== "") {
        const isReady = student.graduation_ready;
        if (columnFilters.status === "Ready" && !isReady) return false;
        if (columnFilters.status === "Incomplete" && isReady) return false;
      }

      if (
        columnFilters.citizenship &&
        !student.citizen_code
          ?.toLowerCase()
          .includes(columnFilters.citizenship.toLowerCase())
      ) {
        return false;
      }

      if (columnFilters.transfer && columnFilters.transfer !== "") {
        const isTransfer = student.transfer_flag;
        if (columnFilters.transfer === "true" && !isTransfer) return false;
        if (columnFilters.transfer === "false" && isTransfer) return false;
      }

      if (columnFilters.cadet && columnFilters.cadet !== "") {
        const isCadet = student.cadet_flag;
        if (columnFilters.cadet === "true" && !isCadet) return false;
        if (columnFilters.cadet === "false" && isCadet) return false;
      }

      if (
        columnFilters.year &&
        !student.student_class_desc
          ?.toLowerCase()
          .includes(columnFilters.year.toLowerCase())
      ) {
        return false;
      }

      if (columnFilters.veteran && columnFilters.veteran !== "") {
        const isVeteran = student.self_reported_veteran_flag;
        if (columnFilters.veteran === "true" && !isVeteran) return false;
        if (columnFilters.veteran === "false" && isVeteran) return false;
      }

      // Missing Classes filter with AND logic
      const missingClassFilters = columnFilters.missingClasses;
      const activeFilters = Object.entries(missingClassFilters).filter(
        ([_, value]) => value
      );

      if (activeFilters.length > 0) {
        const missingCourses = student.missing_courses || [];
        const missingCoursesStr = missingCourses.join(" ").toLowerCase();
        const studentYear = getAcademicYear(student.admit_term);
        const yearCourses = categoryCourses[studentYear] || {
          core: [],
          cs: [],
          dcc: [],
          secure: [],
          minorCore: [],
        };

        // ALL selected filters must match (AND logic)
        const allMatch = activeFilters.every(([key, _]) => {
          switch (key) {
            case "core":
              // Check if any missing course matches the core category for this student's year
              if (yearCourses.core.length === 0) {
                // Fallback to pattern matching if courses not loaded yet
                return (
                  missingCoursesStr.includes("cs1") ||
                  missingCoursesStr.includes("cs2") ||
                  missingCoursesStr.includes("math")
                );
              }
              // Check if any missing course is in the core category list
              return missingCourses.some((course) =>
                yearCourses.core.includes(course.replaceAll(/\s+/g, ""))
              );
            case "cs3xxx":
              return missingCoursesStr.includes("3xxx");
            case "cs45xxx":
              return missingCoursesStr.includes("4/5xxx");
            case "technical":
              return missingCoursesStr.includes("technical");
            case "writing":
              return missingCoursesStr.includes("writing");
            case "communications":
              return missingCoursesStr.includes("communications");
            default:
              return false;
          }
        });

        if (!allMatch) return false;
      }

      // Pathways filter with AND logic
      const pathwaysFilters = columnFilters.pathways;
      const activePathways = Object.entries(pathwaysFilters).filter(
        ([_, value]) => value
      );

      if (activePathways.length > 0) {
        const missingCourses = student.missing_courses || [];
        const missingCoursesStr = missingCourses.join(" ").toLowerCase();

        // ALL selected pathways filters must match (AND logic)
        const allPathwaysMatch = activePathways.every(([key, _]) => {
          switch (key) {
            case "concept1":
              return (
                missingCoursesStr.includes("pathways concept 1") ||
                missingCoursesStr.includes("pathway concept 1") ||
                missingCoursesStr.includes("pathways 1")
              );
            case "concept2":
              return (
                missingCoursesStr.includes("pathways concept 2") ||
                missingCoursesStr.includes("pathway concept 2") ||
                missingCoursesStr.includes("pathways 2")
              );
            case "concept3":
              return (
                missingCoursesStr.includes("pathways concept 3") ||
                missingCoursesStr.includes("pathway concept 3") ||
                missingCoursesStr.includes("pathways 3")
              );
            case "concept4":
              return (
                missingCoursesStr.includes("pathways concept 4") ||
                missingCoursesStr.includes("pathway concept 4") ||
                missingCoursesStr.includes("pathways 4")
              );
            case "concept5":
              return (
                missingCoursesStr.includes("pathways concept 5") ||
                missingCoursesStr.includes("pathway concept 5") ||
                missingCoursesStr.includes("pathways 5")
              );
            case "concept6":
              return (
                missingCoursesStr.includes("pathways concept 6") ||
                missingCoursesStr.includes("pathway concept 6") ||
                missingCoursesStr.includes("pathways 6")
              );
            default:
              return false;
          }
        });

        if (!allPathwaysMatch) return false;
      }

      // Concentration filter with AND logic
      const concentrationFilters = columnFilters.concentration;
      const activeConcentration = Object.entries(concentrationFilters).filter(
        ([_, value]) => value
      );

      if (activeConcentration.length > 0) {
        const missingCourses = student.missing_courses || [];
        const missingCoursesStr = missingCourses.join(" ").toLowerCase();
        const studentYear = getAcademicYear(student.admit_term);
        const yearCourses = categoryCourses[studentYear] || {
          core: [],
          cs: [],
          dcc: [],
          secure: [],
          minorCore: [],
        };

        // Determine student's concentration to filter correctly
        const studentConcentration = (student.concentration || '').toUpperCase();
        const isDCC = studentConcentration === 'DCC';
        const isSecure = studentConcentration === 'SC';
        const isMinor = studentConcentration === 'MIN';
        const isRegularCS = studentConcentration === 'CS';

        // ALL selected concentration filters must match (AND logic)
        const allConcentrationMatch = activeConcentration.every(([key, _]) => {
          switch (key) {
            case "csSpecific":
              // Only filter regular CS students
              if (!isRegularCS) return false;
              // Check if any missing course matches the cs category for this student's year
              if (yearCourses.cs.length === 0) {
                // Fallback to pattern matching if courses not loaded yet
                return (
                  missingCoursesStr.includes("cs specific") ||
                  missingCoursesStr.includes("computer science specific")
                );
              }
              // Check if any missing course is in the cs category list
              return missingCourses.some((course) =>
                yearCourses.cs.includes(course.replaceAll(/\s+/g, ""))
              );
            case "csStatistics":
              // Only filter regular CS students
              if (!isRegularCS) return false;
              return missingCoursesStr.includes("statistics");
            case "csTheory":
              // Only filter regular CS students
              if (!isRegularCS) return false;
              return missingCoursesStr.includes("theory");
            case "csCapstone":
              // Only filter regular CS students
              if (!isRegularCS) return false;
              return missingCoursesStr.includes("capstone");
            case "dccSpecific":
              // Only filter DCC students
              if (!isDCC) return false;
              // Check if any missing course matches the dcc (data-centric) category for this student's year
              if (yearCourses.dcc.length === 0) {
                // Fallback to pattern matching if courses not loaded yet
                return (
                  missingCoursesStr.includes("dcc specific") ||
                  missingCoursesStr.includes("data centric computing specific")
                );
              }
              // Check if any missing course is in the dcc category list
              return missingCourses.some((course) =>
                yearCourses.dcc.includes(course.replaceAll(/\s+/g, ""))
              );
            case "dccStatistics":
              // Only filter DCC students
              if (!isDCC) return false;
              return missingCoursesStr.includes("data centric computing statistics");
            case "dccElectives":
              // Only filter DCC students
              if (!isDCC) return false;
              return missingCoursesStr.includes("data centric computing elective");
            case "dccCapstone":
              // Only filter DCC students
              if (!isDCC) return false;
              return missingCoursesStr.includes("data centric computing capstone");
            case "secureSpecific":
              // Only filter Secure Computing students
              if (!isSecure) return false;
              // Check if any missing course matches the secure category for this student's year
              if (yearCourses.secure.length === 0) {
                // Fallback to pattern matching if courses not loaded yet
                return missingCoursesStr.includes("secure computing specific");
              }
              // Check if any missing course is in the secure category list
              return missingCourses.some((course) =>
                yearCourses.secure.includes(course.replaceAll(/\s+/g, ""))
              );
            case "secureStatistics":
              // Only filter Secure Computing students
              if (!isSecure) return false;
              return missingCoursesStr.includes("secure computing statistics");
            case "secureElectives":
              // Only filter Secure Computing students
              if (!isSecure) return false;
              return missingCoursesStr.includes("secure computing elective");
            case "secureCapstone":
              // Only filter Secure Computing students
              if (!isSecure) return false;
              return missingCoursesStr.includes("secure computing capstone");
            case "minorCore":
              // Only filter CS Minor students
              if (!isMinor) return false;
              // Check if any missing course matches the cs-minor-core category for this student's year
              if (yearCourses.minorCore.length === 0) {
                // Fallback to pattern matching if courses not loaded yet
                return missingCoursesStr.includes("cs minor core");
              }
              // Check if any missing course is in the minor core category list
              return missingCourses.some((course) =>
                yearCourses.minorCore.includes(course.replaceAll(/\s+/g, ""))
              );
            case "minorElective":
              // Only filter CS Minor students
              if (!isMinor) return false;
              return missingCoursesStr.includes("cs minor elective");
            default:
              return false;
          }
        });

        if (!allConcentrationMatch) return false;
      }

      return true;
    });

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue, bValue;

        switch (sortConfig.key) {
          case "studentId":
            aValue = a.id || "";
            bValue = b.id || "";
            break;
          case "name":
            aValue = (a.name || "").toLowerCase();
            bValue = (b.name || "").toLowerCase();
            break;
          case "email":
            aValue = (a.email || "").toLowerCase();
            bValue = (b.email || "").toLowerCase();
            break;
          case "advisor":
            aValue = (a.advisor_lname || "").toLowerCase();
            bValue = (b.advisor_lname || "").toLowerCase();
            break;
          case "concentrationMajor":
            aValue = (a.concentrationMajor || "").toLowerCase();
            bValue = (b.concentrationMajor || "").toLowerCase();
            break;
          case "currentTerm":
            aValue = a.current_term || 0;
            bValue = b.current_term || 0;
            break;
          case "graduationTerm":
            aValue = a.completion_term_code || 0;
            bValue = b.completion_term_code || 0;
            break;
          case "overallGpa":
            aValue = a.overall_gpa || 0;
            bValue = b.overall_gpa || 0;
            break;
          case "inMajorGpa":
            aValue = a.in_major_gpa || 0;
            bValue = b.in_major_gpa || 0;
            break;
          case "status":
            aValue = a.graduation_ready ? 1 : 0;
            bValue = b.graduation_ready ? 1 : 0;
            break;
          case "citizenship":
            aValue = (a.citizen_code || "").toLowerCase();
            bValue = (b.citizen_code || "").toLowerCase();
            break;
          case "transfer":
            aValue = a.transfer_flag ? 1 : 0;
            bValue = b.transfer_flag ? 1 : 0;
            break;
          case "cadet":
            aValue = a.cadet_flag ? 1 : 0;
            bValue = b.cadet_flag ? 1 : 0;
            break;
          case "year":
            aValue = (a.student_class_desc || "").toLowerCase();
            bValue = (b.student_class_desc || "").toLowerCase();
            break;
          case "veteran":
            aValue = a.self_reported_veteran_flag ? 1 : 0;
            bValue = b.self_reported_veteran_flag ? 1 : 0;
            break;
          case "missingClasses":
            // Sort by number of missing courses
            aValue = (a.missing_courses || []).length;
            bValue = (b.missing_courses || []).length;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    setStudents(filtered);
  }, [allStudents, columnFilters, sortConfig, categoryCourses]);

  const handlePageChange = ({ selected }) => {
    setCurrentPage(selected);
  };

  const handleStudentsPerPageChange = (event) => {
    setStudentsPerPage(Number(event.target.value));
    setCurrentPage(0);
  };

  const handleSort = (columnKey) => {
    let direction = "asc";

    if (sortConfig.key === columnKey) {
      if (sortConfig.direction === "asc") {
        direction = "desc";
      } else if (sortConfig.direction === "desc") {
        // Reset to default (no sorting)
        setSortConfig({ key: null, direction: null });
        setCurrentPage(0);
        return;
      }
    }

    setSortConfig({ key: columnKey, direction });
    setCurrentPage(0);
  };

  const handleColumnFilterChange = (column, value) => {
    setColumnFilters((prev) => ({
      ...prev,
      [column]: value,
    }));
    setCurrentPage(0);
  };

  const handleMissingClassFilterChange = (filterKey) => {
    setColumnFilters((prev) => ({
      ...prev,
      missingClasses: {
        ...prev.missingClasses,
        [filterKey]: !prev.missingClasses[filterKey],
      },
    }));
    setCurrentPage(0);
  };

  const handlePathwaysFilterChange = (filterKey) => {
    setColumnFilters((prev) => ({
      ...prev,
      pathways: {
        ...prev.pathways,
        [filterKey]: !prev.pathways[filterKey],
      },
    }));
    setCurrentPage(0);
  };

  const handleConcentrationFilterChange = (filterKey) => {
    setColumnFilters((prev) => ({
      ...prev,
      concentration: {
        ...prev.concentration,
        [filterKey]: !prev.concentration[filterKey],
      },
    }));
    setCurrentPage(0);
  };

  const clearAllColumnFilters = () => {
    setColumnFilters({
      studentId: "",
      name: "",
      email: "",
      advisor: "",
      concentrationMajor: "",
      currentTerm: "",
      graduationTerm: "",
      overallGpa: "",
      inMajorGpa: "",
      status: "",
      citizenship: "",
      transfer: "",
      cadet: "",
      year: "",
      veteran: "",
      missingClasses: {
        core: false,
        cs3xxx: false,
        cs45xxx: false,
        technical: false,
        writing: false,
        communications: false,
      },
      pathways: {
        concept1: false,
        concept2: false,
        concept3: false,
        concept4: false,
        concept5: false,
        concept6: false,
      },
      concentration: {
        csSpecific: false,
        csStatistics: false,
        csTheory: false,
        csCapstone: false,
        dccSpecific: false,
        dccStatistics: false,
        dccElectives: false,
        dccCapstone: false,
        secureSpecific: false,
        secureStatistics: false,
        secureElectives: false,
        secureCapstone: false,
        minorCore: false,
        minorElective: false,
      },
    });
    setCurrentPage(0);
  };

  const toggleColumnVisibility = (column) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  const toggleColumnSelector = () => {
    setShowColumnSelector((prev) => !prev);
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <span className="sort-icon"></span>;
    }
    return sortConfig.direction === "asc" ? (
      <IoCaretUp className="sort-icon active" />
    ) : (
      <IoCaretDown className="sort-icon active" />
    );
  };

  // Helper function to highlight matching text based on active filters
  const highlightMatchingText = (missingCourseText, student) => {
    // Collect all active filter patterns
    const activePatterns = [];

    // Get student's academic year for database-backed categories
    const studentYear = getAcademicYear(student.admit_term);
    const yearCourses = categoryCourses[studentYear] || {
      core: [],
      cs: [],
      dcc: [],
      secure: [],
      minorCore: [],
    };

    // Determine student's concentration to avoid highlighting wrong categories
    const studentConcentration = (student.concentration || '').toUpperCase();
    const isDCC = studentConcentration === 'DCC';
    const isSecure = studentConcentration === 'SC';
    const isMinor = studentConcentration === 'MIN';
    const isRegularCS = studentConcentration === 'CS';

    // Missing Classes filters
    if (columnFilters.missingClasses.core && yearCourses.core.length > 0) {
      // CS Core courses - highlight for all students, but use appropriate course list
      // For CS Minor students, only highlight CS Minor Core courses
      if (isMinor && yearCourses.minorCore.length > 0) {
        const coursePattern = yearCourses.minorCore.join('|');
        if (coursePattern) {
          activePatterns.push({ regex: new RegExp(`\\b(${coursePattern})\\b`, 'gi'), label: 'core', category: 'general' });
        }
      } else {
        // For regular CS, DCC, and Secure students, use full CS Core list
        const coursePattern = yearCourses.core.join('|');
        if (coursePattern) {
          activePatterns.push({ regex: new RegExp(`\\b(${coursePattern})\\b`, 'gi'), label: 'core', category: 'general' });
        }
      }
    }
    if (columnFilters.missingClasses.cs3xxx) {
      // Only highlight the keyword "3xxx", not actual CS3xxx course codes
      activePatterns.push({ regex: /\b3xxx\b/gi, label: '3xxx', category: 'general' });
    }
    if (columnFilters.missingClasses.cs45xxx) {
      // Only highlight the keyword "4/5xxx", not actual CS4xxx or CS5xxx course codes
      activePatterns.push({ regex: /\b4\/5xxx\b/gi, label: '4/5xxx', category: 'general' });
    }
    if (columnFilters.missingClasses.technical) {
      activePatterns.push({ regex: /technical/gi, label: 'technical', category: 'general' });
    }
    if (columnFilters.missingClasses.writing) {
      activePatterns.push({ regex: /writing/gi, label: 'writing', category: 'general' });
    }
    if (columnFilters.missingClasses.communications) {
      activePatterns.push({ regex: /communications/gi, label: 'communications', category: 'general' });
    }

    // Pathways filters
    if (columnFilters.pathways.concept1) {
      activePatterns.push({ regex: /(pathways? concept 1|pathways? 1)/gi, label: 'pathway1', category: 'pathways' });
    }
    if (columnFilters.pathways.concept2) {
      activePatterns.push({ regex: /(pathways? concept 2|pathways? 2)/gi, label: 'pathway2', category: 'pathways' });
    }
    if (columnFilters.pathways.concept3) {
      activePatterns.push({ regex: /(pathways? concept 3|pathways? 3)/gi, label: 'pathway3', category: 'pathways' });
    }
    if (columnFilters.pathways.concept4) {
      activePatterns.push({ regex: /(pathways? concept 4|pathways? 4)/gi, label: 'pathway4', category: 'pathways' });
    }
    if (columnFilters.pathways.concept5) {
      activePatterns.push({ regex: /(pathways? concept 5|pathways? 5)/gi, label: 'pathway5', category: 'pathways' });
    }
    if (columnFilters.pathways.concept6) {
      activePatterns.push({ regex: /(pathways? concept 6|pathways? 6)/gi, label: 'pathway6', category: 'pathways' });
    }

    // Concentration filters - only highlight if student is in that concentration
    if (columnFilters.concentration.csSpecific && yearCourses.cs.length > 0 && isRegularCS) {
      // Only for regular CS students
      const coursePattern = yearCourses.cs.join('|');
      if (coursePattern) {
        activePatterns.push({ regex: new RegExp(`\\b(${coursePattern})\\b`, 'gi'), label: 'csSpecific', category: 'concentration' });
      }
    }
    if (columnFilters.concentration.csStatistics && isRegularCS) {
      activePatterns.push({ regex: /statistics/gi, label: 'csStatistics', category: 'concentration' });
    }
    if (columnFilters.concentration.csTheory && isRegularCS) {
      activePatterns.push({ regex: /theory/gi, label: 'csTheory', category: 'concentration' });
    }
    if (columnFilters.concentration.csCapstone && isRegularCS) {
      activePatterns.push({ regex: /capstone/gi, label: 'csCapstone', category: 'concentration' });
    }
    if (columnFilters.concentration.dccSpecific && yearCourses.dcc.length > 0 && isDCC) {
      // Only for DCC students
      const coursePattern = yearCourses.dcc.join('|');
      if (coursePattern) {
        activePatterns.push({ regex: new RegExp(`\\b(${coursePattern})\\b`, 'gi'), label: 'dccSpecific', category: 'concentration' });
      }
    }
    if (columnFilters.concentration.dccStatistics && isDCC) {
      activePatterns.push({ regex: /data centric computing statistics/gi, label: 'dccStatistics', category: 'concentration' });
    }
    if (columnFilters.concentration.dccElectives && isDCC) {
      activePatterns.push({ regex: /(data centric computing elective)/gi, label: 'dccElectives', category: 'concentration' });
    }
    if (columnFilters.concentration.dccCapstone && isDCC) {
      activePatterns.push({ regex: /data centric computing capstone/gi, label: 'dccCapstone', category: 'concentration' });
    }
    if (columnFilters.concentration.secureSpecific && yearCourses.secure.length > 0 && isSecure) {
      // Only for Secure Computing students
      const coursePattern = yearCourses.secure.join('|');
      if (coursePattern) {
        activePatterns.push({ regex: new RegExp(`\\b(${coursePattern})\\b`, 'gi'), label: 'secureSpecific', category: 'concentration' });
      }
    }
    if (columnFilters.concentration.secureStatistics && isSecure) {
      activePatterns.push({ regex: /secure computing statistics/gi, label: 'secureStatistics', category: 'concentration' });
    }
    if (columnFilters.concentration.secureElectives && isSecure) {
      activePatterns.push({ regex: /(secure computing elective)/gi, label: 'secureElectives', category: 'concentration' });
    }
    if (columnFilters.concentration.secureCapstone && isSecure) {
      activePatterns.push({ regex: /secure computing capstone/gi, label: 'secureCapstone', category: 'concentration' });
    }
    if (columnFilters.concentration.minorCore && yearCourses.minorCore.length > 0 && isMinor) {
      // Only for CS Minor students
      const coursePattern = yearCourses.minorCore.join('|');
      if (coursePattern) {
        activePatterns.push({ regex: new RegExp(`\\b(${coursePattern})\\b`, 'gi'), label: 'minorCore', category: 'concentration' });
      }
    }
    if (columnFilters.concentration.minorElective && isMinor) {
      activePatterns.push({ regex: /cs minor elective/gi, label: 'minorElective', category: 'concentration' });
    }

    // If no filters are active, return plain text
    if (activePatterns.length === 0) {
      return missingCourseText;
    }

    // Create a map to track which parts of the text should be highlighted
    const matches = [];
    activePatterns.forEach(({ regex, label, category }) => {
      let match;
      while ((match = regex.exec(missingCourseText)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          label,
          category,
        });
      }
    });

    // Sort matches by start position
    matches.sort((a, b) => a.start - b.start);

    // Merge overlapping matches
    const mergedMatches = [];
    matches.forEach((match) => {
      if (mergedMatches.length === 0) {
        mergedMatches.push(match);
      } else {
        const last = mergedMatches[mergedMatches.length - 1];
        if (match.start <= last.end) {
          // Overlapping or adjacent - extend the last match
          last.end = Math.max(last.end, match.end);
          last.text = missingCourseText.substring(last.start, last.end);
          // Keep the category from the first match
        } else {
          mergedMatches.push(match);
        }
      }
    });

    // Build the result with highlighted spans
    const result = [];
    let lastIndex = 0;

    mergedMatches.forEach((match, idx) => {
      // Add non-highlighted text before this match
      if (match.start > lastIndex) {
        result.push(
          <span key={`text-${idx}`}>
            {missingCourseText.substring(lastIndex, match.start)}
          </span>
        );
      }

      // Add highlighted text
      result.push(
        <span key={`highlight-${idx}`} className={`highlighted-missing-course highlighted-${match.category}`}>
          {match.text}
        </span>
      );

      lastIndex = match.end;
    });

    // Add remaining non-highlighted text
    if (lastIndex < missingCourseText.length) {
      result.push(
        <span key="text-end">
          {missingCourseText.substring(lastIndex)}
        </span>
      );
    }

    return result;
  };

  // Pagination
  const indexOfLastStudent = (currentPage + 1) * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = students.slice(
    indexOfFirstStudent,
    indexOfLastStudent
  );
  const totalPages = Math.ceil(students.length / studentsPerPage);

  if (loading) {
    return (
      <div className="page-body">
        <h1>Loading audit data...</h1>
      </div>
    );
  }

  return (
    <div className="page-body">
      <Link to="/audits" className="back-button">
        <IoArrowBack /> Back to Audits
      </Link>

      <div className="header-with-controls">
        <h1>Audit {audit_id} - Student Progress</h1>

        <div className="column-selector-wrapper" style={{ display: 'flex', gap: '10px' }}>
          <button
            className="column-selector-toggle"
            onClick={() => toggleColumnVisibility("missingClasses")}
            title="Toggle Missing Classes Column"
            style={{
              backgroundColor: visibleColumns.missingClasses ? '#28a745' : '#6c757d',
            }}
          >
            {visibleColumns.missingClasses ? '✓' : ''} Missing Classes
          </button>

          <button
            className="column-selector-toggle"
            onClick={toggleColumnSelector}
            title="Show/Hide Columns"
          >
            <IoSettingsOutline /> Columns
          </button>

          {showColumnSelector && (
            <div className="column-selector-dropdown">
              <div className="column-selector-header">
                Select Columns to Display
              </div>
              <div className="column-checkbox-list">
                <label>
                  <input
                    type="checkbox"
                    checked={visibleColumns.studentId}
                    onChange={() => toggleColumnVisibility("studentId")}
                  />
                  Student ID
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={visibleColumns.name}
                    onChange={() => toggleColumnVisibility("name")}
                  />
                  Name
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={visibleColumns.email}
                    onChange={() => toggleColumnVisibility("email")}
                  />
                  Email
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={visibleColumns.advisor}
                    onChange={() => toggleColumnVisibility("advisor")}
                  />
                  Advisor
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={visibleColumns.concentrationMajor}
                    onChange={() => toggleColumnVisibility("concentrationMajor")}
                  />
                  Concentration
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={visibleColumns.currentTerm}
                    onChange={() => toggleColumnVisibility("currentTerm")}
                  />
                  Current Term
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={visibleColumns.graduationTerm}
                    onChange={() => toggleColumnVisibility("graduationTerm")}
                  />
                  Graduation Term
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={visibleColumns.overallGpa}
                    onChange={() => toggleColumnVisibility("overallGpa")}
                  />
                  Overall GPA
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={visibleColumns.inMajorGpa}
                    onChange={() => toggleColumnVisibility("inMajorGpa")}
                  />
                  In Major GPA
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={visibleColumns.status}
                    onChange={() => toggleColumnVisibility("status")}
                  />
                  Status
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={visibleColumns.citizenship}
                    onChange={() => toggleColumnVisibility("citizenship")}
                  />
                  Citizenship
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={visibleColumns.transfer}
                    onChange={() => toggleColumnVisibility("transfer")}
                  />
                  Transfer Status
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={visibleColumns.cadet}
                    onChange={() => toggleColumnVisibility("cadet")}
                  />
                  Cadet Status
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={visibleColumns.year}
                    onChange={() => toggleColumnVisibility("year")}
                  />
                  Year
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={visibleColumns.veteran}
                    onChange={() => toggleColumnVisibility("veteran")}
                  />
                  Veteran Status
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="students-table-container">
        <table className="students-table">
          <thead>
            <tr>
              {visibleColumns.studentId && (
                <th
                  className="sortable"
                  onClick={() => handleSort("studentId")}
                >
                  <div className="th-content">
                    Student ID {getSortIcon("studentId")}
                  </div>
                </th>
              )}
              {visibleColumns.name && (
                <th className="sortable" onClick={() => handleSort("name")}>
                  <div className="th-content">Name {getSortIcon("name")}</div>
                </th>
              )}
              {visibleColumns.email && (
                <th className="sortable" onClick={() => handleSort("email")}>
                  <div className="th-content">Email {getSortIcon("email")}</div>
                </th>
              )}
              {visibleColumns.advisor && (
                <th className="sortable" onClick={() => handleSort("advisor")}>
                  <div className="th-content">
                    Advisor {getSortIcon("advisor")}
                  </div>
                </th>
              )}
              {visibleColumns.concentrationMajor && (
                <th className="sortable" onClick={() => handleSort("concentrationMajor")}>
                  <div className="th-content">
                    Concentration {getSortIcon("concentrationMajor")}
                  </div>
                </th>
              )}
              {visibleColumns.currentTerm && (
                <th
                  className="sortable"
                  onClick={() => handleSort("currentTerm")}
                >
                  <div className="th-content">
                    Current Term {getSortIcon("currentTerm")}
                  </div>
                </th>
              )}
              {visibleColumns.graduationTerm && (
                <th
                  className="sortable"
                  onClick={() => handleSort("graduationTerm")}
                >
                  <div className="th-content">
                    Graduation Term {getSortIcon("graduationTerm")}
                  </div>
                </th>
              )}
              {visibleColumns.overallGpa && (
                <th
                  className="sortable"
                  onClick={() => handleSort("overallGpa")}
                >
                  <div className="th-content">
                    Overall GPA {getSortIcon("overallGpa")}
                  </div>
                </th>
              )}
              {visibleColumns.inMajorGpa && (
                <th
                  className="sortable"
                  onClick={() => handleSort("inMajorGpa")}
                >
                  <div className="th-content">
                    In Major GPA {getSortIcon("inMajorGpa")}
                  </div>
                </th>
              )}
              {visibleColumns.status && (
                <th className="sortable" onClick={() => handleSort("status")}>
                  <div className="th-content">
                    Status {getSortIcon("status")}
                  </div>
                </th>
              )}
              {visibleColumns.citizenship && (
                <th
                  className="sortable"
                  onClick={() => handleSort("citizenship")}
                >
                  <div className="th-content">
                    Citizenship {getSortIcon("citizenship")}
                  </div>
                </th>
              )}
              {visibleColumns.transfer && (
                <th className="sortable" onClick={() => handleSort("transfer")}>
                  <div className="th-content">
                    Transfer {getSortIcon("transfer")}
                  </div>
                </th>
              )}
              {visibleColumns.cadet && (
                <th className="sortable" onClick={() => handleSort("cadet")}>
                  <div className="th-content">Cadet {getSortIcon("cadet")}</div>
                </th>
              )}
              {visibleColumns.year && (
                <th className="sortable" onClick={() => handleSort("year")}>
                  <div className="th-content">Year {getSortIcon("year")}</div>
                </th>
              )}
              {visibleColumns.veteran && (
                <th className="sortable" onClick={() => handleSort("veteran")}>
                  <div className="th-content">
                    Veteran {getSortIcon("veteran")}
                  </div>
                </th>
              )}
              {visibleColumns.missingClasses && (
                <th
                  className="sortable"
                  onClick={() => handleSort("missingClasses")}
                >
                  <div className="th-content">
                    Missing Classes {getSortIcon("missingClasses")}
                  </div>
                </th>
              )}
              <th>View</th>
            </tr>
            <tr className="filter-row">
              {visibleColumns.studentId && (
                <th>
                  <input
                    type="text"
                    className="column-filter-input"
                    placeholder="Filter..."
                    value={columnFilters.studentId}
                    onChange={(e) =>
                      handleColumnFilterChange("studentId", e.target.value)
                    }
                  />
                </th>
              )}
              {visibleColumns.name && (
                <th>
                  <input
                    type="text"
                    className="column-filter-input"
                    placeholder="Filter..."
                    value={columnFilters.name}
                    onChange={(e) =>
                      handleColumnFilterChange("name", e.target.value)
                    }
                  />
                </th>
              )}
              {visibleColumns.email && (
                <th>
                  <input
                    type="text"
                    className="column-filter-input"
                    placeholder="Filter..."
                    value={columnFilters.email}
                    onChange={(e) =>
                      handleColumnFilterChange("email", e.target.value)
                    }
                  />
                </th>
              )}
              {visibleColumns.advisor && (
                <th>
                  <input
                    type="text"
                    className="column-filter-input"
                    placeholder="Filter..."
                    value={columnFilters.advisor}
                    onChange={(e) =>
                      handleColumnFilterChange("advisor", e.target.value)
                    }
                  />
                </th>
              )}
              {visibleColumns.concentrationMajor && (
                <th>
                  <select
                    className="column-filter-select"
                    value={columnFilters.concentrationMajor}
                    onChange={(e) =>
                      handleColumnFilterChange("concentrationMajor", e.target.value)
                    }
                  >
                    <option value="">All</option>
                    <option value="CS">CS Major</option>
                    <option value="DCC">Data-Centric Computing</option>
                    <option value="SC">Secure Computing</option>
                    <option value="MIN">Minor</option>
                  </select>
                </th>
              )}
              {visibleColumns.currentTerm && (
                <th>
                  <input
                    type="text"
                    className="column-filter-input"
                    placeholder="Filter..."
                    value={columnFilters.currentTerm}
                    onChange={(e) =>
                      handleColumnFilterChange("currentTerm", e.target.value)
                    }
                  />
                </th>
              )}
              {visibleColumns.graduationTerm && (
                <th>
                  <input
                    type="text"
                    className="column-filter-input"
                    placeholder="Filter..."
                    value={columnFilters.graduationTerm}
                    onChange={(e) =>
                      handleColumnFilterChange("graduationTerm", e.target.value)
                    }
                  />
                </th>
              )}
              {visibleColumns.overallGpa && (
                <th>
                  <input
                    type="text"
                    className="column-filter-input"
                    placeholder="Filter..."
                    value={columnFilters.overallGpa}
                    onChange={(e) =>
                      handleColumnFilterChange("overallGpa", e.target.value)
                    }
                  />
                </th>
              )}
              {visibleColumns.inMajorGpa && (
                <th>
                  <input
                    type="text"
                    className="column-filter-input"
                    placeholder="Filter..."
                    value={columnFilters.inMajorGpa}
                    onChange={(e) =>
                      handleColumnFilterChange("inMajorGpa", e.target.value)
                    }
                  />
                </th>
              )}
              {visibleColumns.status && (
                <th>
                  <select
                    className="column-filter-select"
                    value={columnFilters.status}
                    onChange={(e) =>
                      handleColumnFilterChange("status", e.target.value)
                    }
                  >
                    <option value="">All</option>
                    <option value="Ready">On Track</option>
                    <option value="Incomplete">Incomplete</option>
                  </select>
                </th>
              )}
              {visibleColumns.citizenship && (
                <th>
                  <input
                    type="text"
                    className="column-filter-input"
                    placeholder="Filter..."
                    value={columnFilters.citizenship}
                    onChange={(e) =>
                      handleColumnFilterChange("citizenship", e.target.value)
                    }
                  />
                </th>
              )}
              {visibleColumns.transfer && (
                <th>
                  <select
                    className="column-filter-select"
                    value={columnFilters.transfer}
                    onChange={(e) =>
                      handleColumnFilterChange("transfer", e.target.value)
                    }
                  >
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </th>
              )}
              {visibleColumns.cadet && (
                <th>
                  <select
                    className="column-filter-select"
                    value={columnFilters.cadet}
                    onChange={(e) =>
                      handleColumnFilterChange("cadet", e.target.value)
                    }
                  >
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </th>
              )}
              {visibleColumns.year && (
                <th>
                  <input
                    type="text"
                    className="column-filter-input"
                    placeholder="Filter..."
                    value={columnFilters.year}
                    onChange={(e) =>
                      handleColumnFilterChange("year", e.target.value)
                    }
                  />
                </th>
              )}
              {visibleColumns.veteran && (
                <th>
                  <select
                    className="column-filter-select"
                    value={columnFilters.veteran}
                    onChange={(e) =>
                      handleColumnFilterChange("veteran", e.target.value)
                    }
                  >
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </th>
              )}
              {visibleColumns.missingClasses && (
                <th>
                  <div className="missing-classes-filter-wrapper">
                    <div style={{ display: "flex", gap: "4px" }}>
                      <div style={{ position: "relative" }}>
                        <button
                          className="missing-classes-filter-btn"
                          onClick={() => {
                            setShowMissingClassesDropdown(
                              !showMissingClassesDropdown
                            );
                            setShowConcentrationDropdown(false);
                            setShowPathwaysDropdown(false);
                          }}
                        >
                          General ▼
                        </button>
                        {showMissingClassesDropdown && (
                          <div className="missing-classes-dropdown">
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={columnFilters.missingClasses.core}
                                onChange={() =>
                                  handleMissingClassFilterChange("core")
                                }
                              />
                              CS Core
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={columnFilters.missingClasses.cs3xxx}
                                onChange={() =>
                                  handleMissingClassFilterChange("cs3xxx")
                                }
                              />
                              CS 3XXX Electives
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={columnFilters.missingClasses.cs45xxx}
                                onChange={() =>
                                  handleMissingClassFilterChange("cs45xxx")
                                }
                              />
                              CS 4/5XXX Electives
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={columnFilters.missingClasses.technical}
                                onChange={() =>
                                  handleMissingClassFilterChange("technical")
                                }
                              />
                              Technical Electives (Non CS)
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={columnFilters.missingClasses.writing}
                                onChange={() =>
                                  handleMissingClassFilterChange("writing")
                                }
                              />
                              Writing
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={
                                  columnFilters.missingClasses.communications
                                }
                                onChange={() =>
                                  handleMissingClassFilterChange(
                                    "communications"
                                  )
                                }
                              />
                              Communications
                            </label>
                          </div>
                        )}
                      </div>
                      <div style={{ position: "relative" }}>
                        <button
                          className="missing-classes-filter-btn"
                          onClick={() => {
                            setShowConcentrationDropdown(
                              !showConcentrationDropdown
                            );
                            setShowMissingClassesDropdown(false);
                            setShowPathwaysDropdown(false);
                          }}
                        >
                          Concentration ▼
                        </button>
                        {showConcentrationDropdown && (
                          <div className="missing-classes-dropdown">
                            <div className="dropdown-category-header">
                              Computer Science Major Specific
                            </div>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={columnFilters.concentration.csSpecific}
                                onChange={() =>
                                  handleConcentrationFilterChange("csSpecific")
                                }
                              />
                              CS Specific
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={
                                  columnFilters.concentration.csStatistics
                                }
                                onChange={() =>
                                  handleConcentrationFilterChange(
                                    "csStatistics"
                                  )
                                }
                              />
                              CS Statistics
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={columnFilters.concentration.csTheory}
                                onChange={() =>
                                  handleConcentrationFilterChange("csTheory")
                                }
                              />
                              CS Theory Electives
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={columnFilters.concentration.csCapstone}
                                onChange={() =>
                                  handleConcentrationFilterChange("csCapstone")
                                }
                              />
                              CS Capstone
                            </label>

                            <div className="dropdown-category-header">
                              Data-Centric Computing
                            </div>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={
                                  columnFilters.concentration.dccSpecific
                                }
                                onChange={() =>
                                  handleConcentrationFilterChange("dccSpecific")
                                }
                              />
                              DCC Specific
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={
                                  columnFilters.concentration.dccStatistics
                                }
                                onChange={() =>
                                  handleConcentrationFilterChange(
                                    "dccStatistics"
                                  )
                                }
                              />
                              DCC Statistics
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={
                                  columnFilters.concentration.dccElectives
                                }
                                onChange={() =>
                                  handleConcentrationFilterChange(
                                    "dccElectives"
                                  )
                                }
                              />
                              DCC Electives
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={
                                  columnFilters.concentration.dccCapstone
                                }
                                onChange={() =>
                                  handleConcentrationFilterChange("dccCapstone")
                                }
                              />
                              DCC Capstone
                            </label>

                            <div className="dropdown-category-header">
                              Secure Computing
                            </div>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={
                                  columnFilters.concentration.secureSpecific
                                }
                                onChange={() =>
                                  handleConcentrationFilterChange(
                                    "secureSpecific"
                                  )
                                }
                              />
                              Secure Computing Specific
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={
                                  columnFilters.concentration.secureStatistics
                                }
                                onChange={() =>
                                  handleConcentrationFilterChange(
                                    "secureStatistics"
                                  )
                                }
                              />
                              Secure Computing Statistics
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={
                                  columnFilters.concentration.secureElectives
                                }
                                onChange={() =>
                                  handleConcentrationFilterChange(
                                    "secureElectives"
                                  )
                                }
                              />
                              Secure Electives
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={
                                  columnFilters.concentration.secureCapstone
                                }
                                onChange={() =>
                                  handleConcentrationFilterChange(
                                    "secureCapstone"
                                  )
                                }
                              />
                              Secure Capstone
                            </label>

                            <div className="dropdown-category-header">
                              Computer Science Minor
                            </div>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={columnFilters.concentration.minorCore}
                                onChange={() =>
                                  handleConcentrationFilterChange("minorCore")
                                }
                              />
                              CS Minor Core
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={
                                  columnFilters.concentration.minorElective
                                }
                                onChange={() =>
                                  handleConcentrationFilterChange(
                                    "minorElective"
                                  )
                                }
                              />
                              CS Minor Elective (Non CS)
                            </label>
                          </div>
                        )}
                      </div>
                      <div style={{ position: "relative" }}>
                        <button
                          className="missing-classes-filter-btn"
                          onClick={() => {
                            setShowPathwaysDropdown(!showPathwaysDropdown);
                            setShowMissingClassesDropdown(false);
                            setShowConcentrationDropdown(false);
                          }}
                        >
                          Pathways ▼
                        </button>
                        {showPathwaysDropdown && (
                          <div
                            className="missing-classes-dropdown"
                            style={{ left: "auto", right: "0" }}
                          >
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={columnFilters.pathways.concept1}
                                onChange={() =>
                                  handlePathwaysFilterChange("concept1")
                                }
                              />
                              Pathways Concept 1
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={columnFilters.pathways.concept2}
                                onChange={() =>
                                  handlePathwaysFilterChange("concept2")
                                }
                              />
                              Pathways Concept 2
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={columnFilters.pathways.concept3}
                                onChange={() =>
                                  handlePathwaysFilterChange("concept3")
                                }
                              />
                              Pathways Concept 3
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={columnFilters.pathways.concept4}
                                onChange={() =>
                                  handlePathwaysFilterChange("concept4")
                                }
                              />
                              Pathways Concept 4
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={columnFilters.pathways.concept5}
                                onChange={() =>
                                  handlePathwaysFilterChange("concept5")
                                }
                              />
                              Pathways Concept 5
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={columnFilters.pathways.concept6}
                                onChange={() =>
                                  handlePathwaysFilterChange("concept6")
                                }
                              />
                              Pathways Concept 6
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </th>
              )}
              <th>
                <button
                  className="clear-column-filters-btn"
                  onClick={clearAllColumnFilters}
                  title="Clear all column filters"
                >
                  Clear
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {currentStudents.length === 0 ? (
              <tr>
                <td colSpan="16" style={{ textAlign: "center" }}>
                  No students found matching the current filters.
                </td>
              </tr>
            ) : (
              currentStudents.map((student) => (
                <tr key={student.id}>
                  {visibleColumns.studentId && <td>{student.id}</td>}
                  {visibleColumns.name && <td>{student.name}</td>}
                  {visibleColumns.email && <td>{student.email}</td>}
                  {visibleColumns.advisor && (
                    <td>{student.advisor_lname || "(Unassigned)"}</td>
                  )}
                  {visibleColumns.concentrationMajor && (
                    <td>{student.concentration}</td>
                  )}
                  {visibleColumns.currentTerm && (
                    <td>{formatTerm(student.current_term)}</td>
                  )}
                  {visibleColumns.graduationTerm && (
                    <td>{formatTerm(student.completion_term_code)}</td>
                  )}
                  {visibleColumns.overallGpa && (
                    <td>
                      {student.overall_gpa
                        ? student.overall_gpa.toFixed(2)
                        : "N/A"}
                    </td>
                  )}
                  {visibleColumns.inMajorGpa && (
                    <td>
                      {student.in_major_gpa
                        ? student.in_major_gpa.toFixed(2)
                        : "N/A"}
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td>
                      <span
                        className={
                          student.graduation_ready
                            ? "status-ready"
                            : "status-incomplete"
                        }
                      >
                        {student.graduation_ready ? "On track" : "Incomplete"}
                      </span>
                    </td>
                  )}
                  {visibleColumns.citizenship && (
                    <td>{student.citizen_code || "N/A"}</td>
                  )}
                  {visibleColumns.transfer && (
                    <td>{student.transfer_flag ? "Yes" : "No"}</td>
                  )}
                  {visibleColumns.cadet && (
                    <td>{student.cadet_flag ? "Yes" : "No"}</td>
                  )}
                  {visibleColumns.year && (
                    <td>{student.student_class_desc || "N/A"}</td>
                  )}
                  {visibleColumns.veteran && (
                    <td>{student.self_reported_veteran_flag ? "Yes" : "No"}</td>
                  )}
                  {visibleColumns.missingClasses && (
                    <td>
                      {student.missing_courses &&
                        student.missing_courses.length > 0
                        ? highlightMatchingText(student.missing_courses.join(", "), student)
                        : "None"}
                    </td>
                  )}
                  <td>
                    <Link to={`/audit/${audit_id}/student/${student.id}`}>
                      <IoEyeOutline title="View student details" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination-container">
        <div className="pagination-controls">
          <label htmlFor="students-per-page">Students per page:</label>
          <select
            id="students-per-page"
            className="students-per-page-select"
            value={studentsPerPage}
            onChange={handleStudentsPerPageChange}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {totalPages > 1 && (
          <PaginationComponent
            pageCount={totalPages}
            onPageChange={handlePageChange}
            currentPage={currentPage}
          />
        )}
      </div>

      <div className="summary-info">
        <p>
          Showing {currentStudents.length} of {students.length} students (Total
          in audit: {allStudents.length})
        </p>
      </div>
    </div>
  );
}
